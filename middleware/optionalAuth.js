import jwt from 'jsonwebtoken';

const optionalAuth = async (req, res, next) => {
    const { token } = req.headers;

    if (token) {
        try {
            const token_decode = jwt.verify(token, process.env.JWT_SECRET);
            req.body.userId = token_decode.id;
        } catch (error) {
            // Ignore token verification errors for optional auth
        }
    } else {
        // Explicitly set to null if no token is present to avoid using stale req.body
        req.body.userId = null;
    }
    next();
}

export default optionalAuth;
