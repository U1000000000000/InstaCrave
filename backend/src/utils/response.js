// backend/src/utils/response.js
// Standardized API response utility with pagination metadata

function sendListResponse(res, { data, message = '', pagination = {}, filters = {}, sort = {} }) {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination,
    filters,
    sort,
  });
}

function sendItemResponse(res, { data, message = '' }) {
  res.status(200).json({
    success: true,
    message,
    data,
  });
}

function sendErrorResponse(res, { message = 'An error occurred', status = 500, details = [] }) {
  res.status(status).json({
    success: false,
    message,
    details,
  });
}

module.exports = {
  sendListResponse,
  sendItemResponse,
  sendErrorResponse,
};
