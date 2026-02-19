import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fadeIn">
      <div className="text-6xl mb-4">&#128269;</div>
      <h2 className="text-2xl font-bold text-hexa-dark mb-2">Page Not Found</h2>
      <p className="text-gray-500 mb-6">The page you're looking for doesn't exist or has been moved.</p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-hexa-primary text-white rounded-lg font-medium hover:bg-teal-800 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
