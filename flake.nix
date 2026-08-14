{
  description = "Checks and static package for js-canvas-experiment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, self }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.stdenvNoCC.mkDerivation {
            pname = "js-canvas-experiment";
            version = "1.0.0";
            src = self;
            dontBuild = true;
            installPhase = ''
              runHook preInstall
              mkdir -p $out
              cp app.js favicon.png lib.js $out/
              cp max_speed.html $out/index.html
              runHook postInstall
            '';
          };
        }
      );

      checks = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          npmDeps = pkgs.fetchNpmDeps {
            src = self;
            hash = "sha256-5S5H5lUgYl5JFoCNZ+AGbrCifpx+6Xp3UrZMJM8N+iA=";
          };
          npmCheck =
            name: command:
            pkgs.stdenvNoCC.mkDerivation {
              inherit name npmDeps;
              src = self;
              nativeBuildInputs = [
                pkgs.nodejs_24
                pkgs.npmHooks.npmConfigHook
              ];
              dontConfigure = true;
              buildPhase = ''
                runHook preBuild
                ${command}
                runHook postBuild
              '';
              installPhase = "touch $out";
            };
        in
        {
          actionlint = pkgs.runCommand "actionlint" { nativeBuildInputs = [ pkgs.actionlint ]; } ''
            actionlint -config-file ${self}/.github/actionlint.yaml ${self}/.github/workflows/ci.yml
            touch $out
          '';
          format = npmCheck "format" "npm run format:check";
          lint = npmCheck "lint" "npm run lint";
          syntax = npmCheck "syntax" "node --check app.js && node --check lib.js && node --check tailwind.config.js";
          package = self.packages.${system}.default;
        }
      );

      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.actionlint
              pkgs.nodejs_24
            ];
          };
        }
      );

      formatter = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        pkgs.writeShellApplication {
          name = "nix-fmt";
          runtimeInputs = [ pkgs.nixfmt ];
          text = "nixfmt flake.nix";
        }
      );
    };
}
