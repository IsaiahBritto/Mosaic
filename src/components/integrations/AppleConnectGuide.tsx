export function AppleConnectGuide() {
  return (
    <ol className="list-decimal space-y-2 pl-4 text-xs text-text-secondary">
      <li>
        Go to{" "}
        <a
          href="https://appleid.apple.com"
          target="_blank"
          rel="noreferrer"
          className="text-accent underline"
        >
          appleid.apple.com
        </a>{" "}
        → Sign-In and Security
      </li>
      <li>Enable Two-Factor Authentication</li>
      <li>Generate an App-Specific Password labeled &quot;Mosaic Calendar&quot;</li>
      <li>Enter your Apple ID email and app-specific password below</li>
    </ol>
  );
}
