export const successResponse = (data: any, message?: string) => ({
    success: true,
    message: message || 'Success',
    data
});

export const errorResponse = (code: string, message: string, details?: any) => ({
    success: false,
    error: {
        code,
        message,
        details
    }
});