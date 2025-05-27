export const errorHandler = (err, req, res, next) => {
  console.error("Error occurred:", err);
  if (err.status) {
    res.status(err.status).json({ msg: err.message });
  } else {
    res.status(500).json({ msg: err.message });
  }
};
