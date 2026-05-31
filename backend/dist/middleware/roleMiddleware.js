"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = void 0;
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            console.log('typeof req.user.role:', typeof req.user.role);
            console.log('req.user.role (raw):', JSON.stringify(req.user.role));
            console.log('allowedRoles:', allowedRoles);
            console.log('allowedRoles[1] (raw):', JSON.stringify(allowedRoles[1]));
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}
exports.authorizeRoles = authorizeRoles;
