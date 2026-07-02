import {prisma} from "../database/db.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { generateAccessAndRefreshToken, refreshAccessToken } from "../controllers/auth.controller.js";

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

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
        throw new ApiError(401, "Unauthorized user");
    }
    // console.log("token: ", token);

    try {
      const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    //   console.log("decodeToken: ", decodeToken);
      const user = await prisma.users.findFirst({
        where: {
          id: decodeToken?.id,
        },
        select: safeUserSelect,
      });
    //   console.log("user: ", user);

      if (!user) {
        throw new ApiError(402, "Invalid access token");
      }
      // console.log("Hitted access");
      req.user = user;
      next();
    } catch (error) {
        // console.log(error.name);
        if(error.name === "TokenExpiredError" && req.cookies?.refreshToken){
            try {
                const { user, accesssToken, refreshToken } =
                    await refreshAccessTokenService(req.cookies.refreshToken);

                const options = {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                };

                res.cookie("accessToken", accesssToken, options);
                res.cookie("refreshToken", refreshToken, options);

                req.user = user;
                // console.log("Hitted refresh")
                return next();
            } catch (err) {
                console.log("REFRESH ERROR:", err);
                throw new ApiError(401, "Session expired");
            }
        }
        else throw new ApiError(401, "Inavlid access token");
    }
});


// just for temporary puorposes until the frontend is not developed 
const refreshAccessTokenService = async (incomingRefreshToken) => {
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized access");
    }

    const decodeToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    );

    const user = await prisma.users.findFirst({
        where: { id: decodeToken.id },
    });

    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user.refresh_token) {
        throw new ApiError(401, "Session expired");
    }

    const { accesssToken, refreshToken } = await generateAccessAndRefreshToken(
        user.id
    );

    await prisma.users.update({
        where: { id: user.id },
        data: { refresh_token: refreshToken },
    });

    return { user, accesssToken, refreshToken };
};
