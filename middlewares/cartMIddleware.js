const fetchCartCountMiddleware = (req, res, next) => {
  fetch("/cart/count")
    .then((response) => response.json())
    .then((data) => {
      res.locals.cartCount = data.totalItems; // Set cartCount in res.locals
      next();
    })
    .catch((error) => {
      console.error("Error fetching cart count:", error);
      next(error);
    });
};

app.use(fetchCartCountMiddleware);
