import { withAuth } from "next-auth/middleware";

export default withAuth({
    pages: {
        signIn: "/login",
    },
});


export const config = {
    matcher: [
        "/dashboard/:path*",
        "/members/:path*",
        "/projects/:path*",
        "/assignments/:path*",
        "/summary/:path*",
    ],
};
