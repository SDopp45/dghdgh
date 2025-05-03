{pkgs}: {
  deps = [
    pkgs.poppler
    pkgs.ghostscript
    pkgs.chromedriver
    pkgs.chromium
    pkgs.geckodriver
    pkgs.postgresql
  ];
}
