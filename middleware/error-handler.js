module.exports = {
    notFound: (req, res) => {
        res.status(404).render('shared/404', {
            title: 'Page Not Found',
            message: "The page you're looking for doesn't exist."
        });
    },

    serverError: (err, req, res, next) => {
        console.error('Error:', err);
        res.status(500).render('shared/error', {
            title: 'Error',
            message: process.env.NODE_ENV === 'production' 
                ? 'Something went wrong!'
                : err.message
        });
    }
};