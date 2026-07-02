import {prisma} from "../database/db.js";
import {
    generateAccessToken,
    generateRefreshToken,
    hashPassword,
    isPasswordCorrect,
    generateTemporaryToken,
} from "../services/user.services.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
    emailVerificationMailgenContent,
    sendEmail,
    forgotPasswordMailgenContent,
} from "../utils/mail.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

export const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await prisma.users.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            throw new ApiError(404, "User not found while generating tokens");
        }

        const accesssToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await prisma.users.update({
            where: {
                id: userId,
            },
            data: {
                refresh_token: refreshToken,
            },
        });

        return { accesssToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access token"
        );
    }
};

const safeUserSelect = {
    id: true,
    username: true,
    email: true,
    role: true,
    skills: true,
    organization_id: true,
    is_email_verified: true,
    created_at: true,
};

export const registerUser = asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;
    // handle valid input by middlewares

    const existing = await prisma.users.findFirst({
        where: {
            OR: [{ email }, { username }],
        },
    });
    if (existing) {
        throw new ApiError(409, "Email or username already exists");
    }

    const hashedPass = await hashPassword(password);

    const { unHashedToken, hashedToken, tokenExpiry } = generateTemporaryToken();

    const createdUser = await prisma.users.create({
      data: {
        username,
        email,
        password: hashedPass,
        is_email_verified: false,
        refresh_token: null,
        forgot_password_token: null,
        forgot_password_expiry: null,
        email_verification_token: hashedToken,
        email_verification_expiry: new Date(tokenExpiry),
      },
      select: safeUserSelect,
    });
    if (!createdUser) {
        throw new ApiError(
            500,
            "Something wrong happened while registering the user."
        );
    }

    await sendEmail({
        email: createdUser?.email,
        subject: "Please verify your email",
        mailgenContent: emailVerificationMailgenContent(
            createdUser.username,
            `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${unHashedToken}`
        ),
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                { user: createdUser },
                "User registered succefully and verification email has been sent on your email."
            )
        );
});

// there can be a bug in app when username matches to an existing email.
export const loginUser = asyncHandler(async (req, res) => {
    const { emailOrUsername, password } = req.body;
    const user = await prisma.users.findFirst({
        where: {
            OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
        },
    });

    if (!user) {
        throw new ApiError(400, "User not found");
    }

    const isPasswordValid = await isPasswordCorrect(password, user.password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    const { accesssToken, refreshToken } = await generateAccessAndRefreshToken(
        user.id
    );

    const loggedInUser = await prisma.users.findUnique({
        where: { id: user.id },
        select: safeUserSelect,
    });

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    };

    return res
        .status(200)
        .cookie("accessToken", accesssToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accesssToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );
});

export const logoutUser = asyncHandler(async (req, res) => {
    await prisma.users.update({
        where: {
            id: req.user.id,
        },
        data: {
            refresh_token: "",
        },
    });

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
});

export const verifyEmail = asyncHandler(async (req, res) => {
    const { verificationToken } = req.params;

    if (!verificationToken) {
        throw new ApiError(400, "Email verification token is missing");
    }

    const hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    const user = await prisma.users.findFirst({
        where: {
            email_verification_token: hashedToken,
            email_verification_expiry: {
                gt: new Date(),
            },
        },
    });

    if (!user) {
        throw new ApiError(400, "Token is invalid or expired");
    }

    await prisma.users.update({
        where: {
            id: user.id,
        },
        data: {
            email_verification_token: null,
            email_verification_expiry: null,
            is_email_verified: true,
        },
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                isEmailVerified: true,
            },
            "Email is verifed"
        )
    );
});

export const resendEmailVerification = asyncHandler(async (req, res) => {
    const user = await prisma.users.findFirst({
        where: {
            id: req.user.id,
        },
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    if (user.is_email_verified) {
        throw new ApiError(409, "Email is already verified");
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
        generateTemporaryToken();

    await prisma.users.update({
        where: {
            id: user.id,
        },
        data: {
            email_verification_token: hashedToken,
            email_verification_expiry: new Date(tokenExpiry),
        },
    });

    await sendEmail({
        email: user?.email,
        subject: "Please verify your email",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${unHashedToken}`
        ),
    });

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    };
    return res
        .status(200)
        .cookie("emailVerificationToken", unHashedToken, options)
        .json(new ApiResponse(200, {}, "Mail has sent to your email id"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized access");
    }

    try {
        const decodeToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await prisma.users.findFirst({
            where: {
                id: decodeToken.id,
            },
        });

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refresh_token) {
            throw new ApiError(401, "Session expired. Login again");
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        };

        const { accesssToken, refreshToken } =
            await generateAccessAndRefreshToken(user.id);

        await prisma.users.update({
            where: {
                id: user.id,
            },
            data: {
                refresh_token: refreshToken,
            },
        });

        const loggedInUser = await prisma.users.findUnique({
            where: { id: user.id },
            select: safeUserSelect,
        });

        return res
            .status(200)
            .cookie("accessToken", accesssToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accesssToken, refreshToken, user: loggedInUser },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token");
    }
});

export const forgotPasswordRequest = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await prisma.users.findFirst({
        where: {
            email: email,
        },
    });
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
        generateTemporaryToken();

    await prisma.users.update({
        where: {
            id: user.id,
        },
        data: {
            forgot_password_token: hashedToken,
            forgot_password_expiry: new Date(tokenExpiry),
        },
    });

    await sendEmail({
        email: user?.email,
        subject: "Password reset request",
        mailgenContent: forgotPasswordMailgenContent(
            user.username,
            `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`
        ),
    });

    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)
        .cookie("passwordResetToken", unHashedToken, options)
        .json(
            new ApiResponse(
                200,
                {},
                "Password reset mail has been sent on your mail"
            )
        );
});

export const resetPassword = asyncHandler(async (req, res) => {
    const { resetToken } = req.params;
    const { newPassword } = req.body;

    let hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    const user = await prisma.users.findFirst({
        where: {
            forgot_password_token: hashedToken,
            forgot_password_expiry: {
                gt: new Date(),
            },
        },
    });

    if (!user) {
        throw new ApiError(400, "Token is invalid or expired");
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.users.update({
        where: {
            id: user.id,
        },
        data: {
            forgot_password_expiry: null,
            forgot_password_token: null,
            password: hashedPassword,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password reset successfully"));
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await prisma.users.findFirst({
        where: {
            id: req.user?.id,
        },
    });
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }
    const isPasswordValid = await isPasswordCorrect(oldPassword, user.password);
    if (!isPasswordValid) {
        throw new ApiError(400, "Old password is invalid");
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.users.update({
        where: {
            id: user.id,
        },
        data: {
            password: hashedPassword,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "User password has been been changed"));
});

export const updateUserProfile = asyncHandler(async (req, res) => {
    const { skills } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(skills)) {
        throw new ApiError(400, "Skills must be provided as an array.");
    }

    const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: {
            skills,
        },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
            skills: true,
            organization_id: true,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

