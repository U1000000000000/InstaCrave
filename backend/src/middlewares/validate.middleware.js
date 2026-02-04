/**
 * Usage: validate({ body: schema, query: schema, params: schema })
 */
const validate = (schemas) => async (req, res, next) => {
  const locations = ['body', 'query', 'params'];
  try {
    for (const loc of locations) {
      if (schemas[loc]) {
// Use validateAsync to support schemas with external rules
        await schemas[loc].validateAsync(req[loc]);
      }
    }
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.details ? error.details[0].message : error.message,
});
  }
};

module.exports = validate;
