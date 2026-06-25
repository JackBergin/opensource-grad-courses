export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--color-rule)] py-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="eyebrow">
          MIT Sloan MBA — Learning Platform
        </p>
        <p className="text-[13px] text-[var(--color-muted)]">
          Content from{" "}
          <a
            href="https://ocw.mit.edu"
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            MIT OpenCourseWare
          </a>{" "}
          under{" "}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            CC BY-NC-SA 4.0
          </a>
          . Free and open to all.
        </p>
      </div>
    </footer>
  );
}
