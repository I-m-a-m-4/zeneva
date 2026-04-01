import { Metadata } from 'next';
import { adminFirestore } from '@/firebase/admin';

type Props = {
    params: { businessId: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const businessId = params.businessId;

    const rootOgImageUrl = 'https://i.ibb.co/Z69q8yJD/20260215-0958-Image-Generation-remix-01khg89f7jf59sbf395x7pw9k0.png';

    // Default metadata used if business is not found or adminSDK fails
    const defaultMetadata: Metadata = {
        title: 'Shop on Zeneva',
        description: 'Discover and shop from amazing local businesses on the Zeneva platform.',
        openGraph: {
            title: 'Zeneva Store',
            description: 'Capture every opportunity and maximize every sale with Zeneva.',
            images: [
                {
                    url: rootOgImageUrl,
                    width: 1200,
                    height: 630,
                    type: 'image/png',
                    alt: 'Zeneva Store',
                },
            ],
            type: 'website',
            siteName: 'Zeneva',
        },
        twitter: {
            card: 'summary_large_image',
            title: 'Zeneva Store',
            description: 'Capture every opportunity and maximize every sale with Zeneva.',
            images: [rootOgImageUrl],
        },
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
            // Use root image as fallback instead of missing og-image.jpg
            const rootOgImageUrl = 'https://i.ibb.co/Z69q8yJD/20260215-0958-Image-Generation-remix-01khg89f7jf59sbf395x7pw9k0.png';
            const imageUrl = settings.logoUrl || publicStore.bannerImageUrl || rootOgImageUrl;

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
                            type: 'image/png',
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
