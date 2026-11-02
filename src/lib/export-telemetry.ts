import { collection, addDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import { trackFeature } from '@/lib/product-telemetry';

export type ExportType =
  | 'inventory'
  | 'customers'
  | 'expenses'
  | 'purchases'
  | 'reports'
  | 'profit_loss'
  | 'top_items'
  | 'receipts'
  | 'analytics';

export type ChurnRiskLevel = 'low' | 'medium' | 'high';

export interface ExportTelemetryPayload {
  businessId: string;
  businessName?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  exportType: ExportType;
  filename: string;
  recordCount: number;
  metadata?: Record<string, any>;
}

export interface ExportLogEntry extends ExportTelemetryPayload {
  id?: string;
  riskLevel: ChurnRiskLevel;
  riskReason: string;
  createdAt: any;
}

/**
 * Computes churn risk indicator based on what was exported and volume.
 * Downloading entire customer phonebooks or large product catalogs is a
 * primary indicator of a store preparing to migrate away from Zeneva.
 */
export function calculateExportRisk(
  exportType: ExportType,
  recordCount: number
): { riskLevel: ChurnRiskLevel; riskReason: string } {
  if (exportType === 'customers') {
    if (recordCount >= 50) {
      return {
        riskLevel: 'high',
        riskReason: `Exported ${recordCount} customer contacts (high churn / data extraction risk)`,
      };
    }
    if (recordCount >= 10) {
      return {
        riskLevel: 'medium',
        riskReason: `Exported ${recordCount} customer contacts`,
      };
    }
    return { riskLevel: 'low', riskReason: 'Routine customer list export' };
  }

  if (exportType === 'inventory') {
    if (recordCount >= 100) {
      return {
        riskLevel: 'high',
        riskReason: `Exported full catalog (${recordCount} items) — potential competitor migration`,
      };
    }
    if (recordCount >= 25) {
      return {
        riskLevel: 'medium',
        riskReason: `Exported ${recordCount} inventory items`,
      };
    }
    return { riskLevel: 'low', riskReason: 'Routine inventory export' };
  }

  if (exportType === 'reports' || exportType === 'profit_loss' || exportType === 'analytics') {
    if (recordCount >= 200) {
      return {
        riskLevel: 'medium',
        riskReason: `Exported comprehensive financial/sales ledger (${recordCount} rows)`,
      };
    }
    return { riskLevel: 'low', riskReason: 'Financial reporting export' };
  }

  return { riskLevel: 'low', riskReason: 'Standard data export' };
}

/**
 * Logs an export event to Firestore `export_logs` collection for super-admin telemetry and churn monitoring.
 * Safe & resilient: will not throw or break the client download flow if Firestore fails.
 */
export async function logExportEvent(
  firestore: Firestore | null | undefined,
  payload: ExportTelemetryPayload
): Promise<void> {
  // Always increment the local product telemetry counter
  try {
    trackFeature('reports_exported');
  } catch {
    // ignore
  }

  if (!firestore || !payload.businessId) {
    return;
  }

  try {
    const { riskLevel, riskReason } = calculateExportRisk(payload.exportType, payload.recordCount);

    const docData: Omit<ExportLogEntry, 'id'> = {
      businessId: payload.businessId,
      businessName: payload.businessName || 'Unknown Store',
      userId: payload.userId || 'unknown',
      userName: payload.userName || 'Anonymous Staff',
      userEmail: payload.userEmail || '',
      exportType: payload.exportType,
      filename: payload.filename,
      recordCount: payload.recordCount,
      riskLevel,
      riskReason,
      metadata: payload.metadata || {},
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(firestore, 'export_logs'), docData);
  } catch (err) {
    console.error('[Export Telemetry] Failed to record export event:', err);
  }
}
