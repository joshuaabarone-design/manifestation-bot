#!/bin/sh
# Xcode Cloud post-clone step: build the web bundle and sync it into the iOS project.
# Xcode Cloud runs this from ios/App/ci_scripts. Configure these as Xcode Cloud
# environment variables (NOT in code): VITE_API_BASE_URL (required),
# VITE_APPLE_SERVICES_ID, VITE_APPLE_BUNDLE_ID, VITE_PRIVACY_POLICY_URL, VITE_SUPPORT_URL.
set -eu

if [ -z "${VITE_API_BASE_URL:-}" ]; then
  echo "error: VITE_API_BASE_URL is not set. The native app needs the hosted API URL (https://...)." >&2
  exit 1
fi

# Xcode Cloud images do not ship Node.js.
if ! command -v node >/dev/null 2>&1; then
  export HOMEBREW_NO_INSTALL_CLEANUP=1
  export HOMEBREW_NO_AUTO_UPDATE=1
  brew install node@20
  export PATH="$(brew --prefix node@20)/bin:$PATH"
fi

cd "$CI_PRIMARY_REPOSITORY_PATH"
node --version
npm ci
npm run build:web
npx cap sync ios
