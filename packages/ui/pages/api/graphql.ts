import { createProxyMiddleware } from 'http-proxy-middleware';
import { NextApiRequest, NextApiResponse } from 'next';

export const config = {
    api: {
        bodyParser: false,
        externalResolver: true,
    }
};

// Create proxy instance outside of handler to reuse
const apiProxy = createProxyMiddleware({
    target: process.env.NEXT_PRIVATE_API_URL,
    changeOrigin: true,
    pathRewrite: { '^/api/graphql': '/graphql' },
});

// Convert http-proxy-middleware to Next.js API route
export default function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // @ts-ignore - type mismatch between Next.js and http-proxy-middleware
        apiProxy(req, res, (result: any) => {
            if (result instanceof Error) {
                throw result;
            }
        });
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: 'Proxy Error' });
    }
} 