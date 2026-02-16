/** @format */

export const errorHandlerMiddleware = (
    err,
    req, 
    res,
    next
) => {
    console.error("Error Handler Middleware Error:", err);
    console.info("Error Handler Middleware Error Message:", err.message);

    res.status(500).json({
        success: false,
        message: "Internal Server Error",
    })
}