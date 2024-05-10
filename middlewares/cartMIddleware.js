const fetchCartCountMiddleware = (req, res, next) => {
  fetch("/cart/count")
    .then((response) => response.json())
    .then((data) => {
      res.locals.totalItems = data.totalItems; // Set totalItems in res.locals
      next();
    })
    .catch((error) => {
      console.error("Error fetching cart count:", error);
      res.locals.totalItems = 0; // Set totalItems to 0 if there's an error
      next();
    });
};

app.use(fetchCartCountMiddleware);
