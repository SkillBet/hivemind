import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-6xl font-bold text-cyan text-glow">404</p>
      <h1 className="mt-4 text-2xl font-semibold">This signal is lost in the hive.</h1>
      <p className="mt-2 text-white/50">The page you requested doesn&apos;t exist.</p>
      <Link href="/" className="btn-glow mt-8">
        Return Home
      </Link>
    </section>
  );
}
