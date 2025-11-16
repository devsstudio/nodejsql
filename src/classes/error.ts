import { ValidationError } from "class-validator";

export class DevsStudioNodejsqlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DevsStudioNodejsqlError";
  }

  static fromValidationErrors(errors: ValidationError[]) {
    for (let error of errors) {
      if (error.constraints) {
        for (let [key, value] of Object.entries(error.constraints)) {
          return new DevsStudioNodejsqlError(value);
        }
      }
    }
    return new DevsStudioNodejsqlError("unknown validation error");
  }
}