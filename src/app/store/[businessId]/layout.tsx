import { Metadata } from 'next';
import { adminFirestore } from '@/firebase/admin';

type Props = {
    params: { businessId: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const businessId = params.businessId;

    // Default metadata
    const defaultMetadata: Metadata = {
        title: 'Zeneva Store',
        description: 'Check out this store on Zeneva.',
    };

    if (!adminFirestore) {
        console.warn('Firebase Admin not initialized for metadata generation');
        return defaultMetadata;
    }

    try {
        // 1. Try to find by slug
        const businessesRef = adminFirestore.collection('businessInstances');
        const q = businessesRef.where('settings.publicStore.slug', '==', businessId).limit(1);
        const snapshot = await q.get();

        let businessData: any = null;

        if (!snapshot.empty) {
            businessData = snapshot.docs[0].data();
        } else {
            // 2. Fallback: Try to find by ID
            const docRef = businessesRef.doc(businessId);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                businessData = docSnap.data();
            }
        }

        if (businessData && businessData.settings?.publicStore?.enabled) {
            const settings = businessData.settings;
            const publicStore = settings.publicStore || {};

            const title = publicStore.headline || businessData.name || 'Zeneva Store';
            const description = publicStore.description || `Check out products from ${businessData.name} on Zeneva.`;
            const imageUrl = settings.logoUrl || publicStore.bannerImageUrl || 'https://zeneva.space/og-image.jpg'; // Fallback image

            return {
                title: `${title} | Zeneva Store`,
                description: description,
                openGraph: {
                    title: title,
                    description: description,
                    images: [
                        {
                            url: imageUrl,
                            width: 1200,
                            height: 630,
                            alt: title,
                        },
                    ],
                    type: 'website',
                    siteName: 'Zeneva',
                },
                twitter: {
                    card: 'summary_large_image',
                    title: title,
                    description: description,
                    images: [imageUrl],
                },
            };
        }
    } catch (error) {
        console.error('Error generating metadata for store:', error);
    }

    return defaultMetadata;
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50">
            {children}
        </div>
    );
}
