import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    const extractErrors = []; // For knowing more about the error
    errors.array().forEach((err) => {
        extractErrors.push({ [err.path]: err.msg });
    });

    throw new ApiError(422, "Received data is not valid.", extractErrors);
};
