module.exports = function isAdmin(req, res, next) {
    // Debug logging
    console.log('Admin check - User:', req.session.user);
    
    if (!req.session.user) {
        console.log('No user session - redirecting to login');
        return res.redirect('/login');
    }
    
    if (!req.session.user.is_admin) {
        console.log('User is not admin - access denied');
        return res.status(403).send('Forbidden: Admin access required');
    }
    
    console.log('Admin access granted');
    next();
};