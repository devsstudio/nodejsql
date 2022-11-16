export class DevsStudioNodejsqlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DevsStudioNodejsqlError";
  }
}