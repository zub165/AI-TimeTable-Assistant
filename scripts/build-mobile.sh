#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/releases"
mkdir -p "$OUT"

cd "$ROOT/mobile"
flutter pub get

echo "Building Android App Bundle (AAB)..."
flutter build appbundle --release
cp build/app/outputs/bundle/release/app-release.aab "$OUT/voice-time-manager-v1.0.0.aab"

echo "Building iOS (simulator + IPA attempt)..."
flutter build ios --simulator --release
flutter build ipa --release --export-options-plist=ios/ExportOptions.plist 2>/dev/null || \
  echo "IPA requires signing — simulator build at mobile/build/ios/iphonesimulator/"

if [[ -d build/ios/iphoneos/Runner.app ]]; then
  cd build/ios/iphoneos && zip -qr "$OUT/voice-time-manager-v1.0.0-simulator.zip" Runner.app
fi

echo "Artifacts in $OUT"
