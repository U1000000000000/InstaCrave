/**
 * Usage: validate({ body: schema, query: schema, params: schema })
 */
const validate = (schemas) => (req, res, next) => {
  const locations = ['body', 'query', 'params'];
  for (const loc of locations) {
    if (schemas[loc]) {
      const { error } = schemas[loc].validate(req[loc]);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }
    }
  }
  next();
};

module.exports = validate;
