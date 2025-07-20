import Link from "next/link";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="bg-background p-8 md:p-10 rounded-2xl shadow-lg max-w-md w-full text-center border border-gray-200">
        <h1 className="text-5xl font-bold text-soraxi-green mb-2">403</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Access Forbidden
        </h2>
        <p className="text-gray-600 mb-6">
          You don`&apos;`t have permission to access this page.
          <br />
          Please contact your administrator if you believe this is a mistake.
        </p>
        <Link
          href="/admin/dashboard"
          className="inline-block bg-soraxi-green hover:bg-soraxi-green/90 text-white font-medium py-2 px-6 rounded-xl transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
