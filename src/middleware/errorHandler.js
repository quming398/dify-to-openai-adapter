const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // 如果是 Axios 错误
  if (err.response) {
    const status = err.response.status;
    const data = err.response.data;
    
    return res.status(status).json({
      error: {
        message: data.message || 'Request failed',
        type: 'api_error',
        code: data.code || 'upstream_error',
        details: data
      }
    });
  }

  // 如果是网络错误
  if (err.request) {
    return res.status(503).json({
      error: {
        message: 'Service temporarily unavailable',
        type: 'api_error',
        code: 'service_unavailable'
      }
    });
  }

  // 其他错误
  res.status(500).json({
    error: {
      message: err.message || 'Internal server error',
      type: 'api_error',
      code: 'internal_error'
    }
  });
};

module.exports = {
  errorHandler
};
