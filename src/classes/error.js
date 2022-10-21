class DevsStudioNodejsqlError extends Error {
  constructor(message) {
    super(message);
    this.name = "DevsStudioNodejsqlError";
  }
}

exports.DevsStudioNodejsqlError = DevsStudioNodejsqlError;
