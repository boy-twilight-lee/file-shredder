"""Wrap the generated NSIS installer in the branded WinForms installer shell."""

from __future__ import annotations

import json
import subprocess
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Sequence


@dataclass(frozen=True)
class CommandResult:
    """Captured result of an external command."""

    success: bool
    return_code: int
    stdout: str
    stderr: str


class InstallerShellBuildError(RuntimeError):
    """Raised when the installer shell cannot be built safely."""


def run_command(arguments: Sequence[str], working_directory: Path) -> CommandResult:
    """Run a command and capture a UTF-8 result without opening a console window."""

    try:
        completed_process = subprocess.run(
            list(arguments),
            cwd=working_directory,
            check=False,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
    except OSError as error:
        return CommandResult(False, -1, "", str(error))

    return CommandResult(
        completed_process.returncode == 0,
        completed_process.returncode,
        completed_process.stdout,
        completed_process.stderr,
    )


def find_csharp_compiler() -> Path:
    """Return the system .NET Framework compiler used for a runtime-free shell."""

    windows_directory = Path("C:/Windows")
    candidates = (
        windows_directory / "Microsoft.NET/Framework64/v4.0.30319/csc.exe",
        windows_directory / "Microsoft.NET/Framework/v4.0.30319/csc.exe",
    )
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise InstallerShellBuildError("未找到 .NET Framework C# 编译器 csc.exe。")


def remove_stale_update_metadata(release_directory: Path, artifact_name: str) -> None:
    """Remove metadata whose hashes no longer match the wrapped executable."""

    stale_paths = (
        release_directory / f"{artifact_name}.blockmap",
        release_directory / "latest.yml",
    )
    for stale_path in stale_paths:
        try:
            stale_path.unlink(missing_ok=True)
        except OSError as error:
            raise InstallerShellBuildError(f"无法删除旧构建元数据 {stale_path}: {error}") from error


def compile_installer_shell(
    project_directory: Path,
    compiler_path: Path,
    core_installer_path: Path,
    output_path: Path,
) -> CommandResult:
    """Compile the shell and embed the NSIS installer and application artwork."""

    source_path = project_directory / "installer-shell/Program.cs"
    manifest_path = project_directory / "installer-shell/app.manifest"
    icon_path = project_directory / "src/assets/app-icon.ico"
    logo_path = project_directory / "src/assets/app-icon.png"
    required_paths = (source_path, manifest_path, icon_path, logo_path, core_installer_path)
    missing_paths = [str(path) for path in required_paths if not path.is_file()]
    if missing_paths:
        raise InstallerShellBuildError("缺少安装器构建文件: " + ", ".join(missing_paths))

    arguments = (
        str(compiler_path),
        "/nologo",
        "/utf8output",
        "/target:winexe",
        "/platform:anycpu",
        "/optimize+",
        "/reference:System.dll",
        "/reference:System.Core.dll",
        "/reference:System.Drawing.dll",
        "/reference:System.Windows.Forms.dll",
        f"/win32icon:{icon_path}",
        f"/win32manifest:{manifest_path}",
        f"/resource:{core_installer_path},Installer.Core",
        f"/resource:{logo_path},Installer.Logo",
        f"/out:{output_path}",
        str(source_path),
    )
    return run_command(arguments, project_directory)


def build_installer_shell(project_directory: Path) -> Path:
    """Replace the generated NSIS artifact with the branded installer shell."""

    release_directory = project_directory / "release"
    artifact_name = "文件粉碎精灵安装程序.exe"
    final_installer_path = release_directory / artifact_name
    core_installer_path = release_directory / ".file-shredder-installer-core.exe"
    shell_output_path = release_directory / ".file-shredder-installer-shell.exe"

    if not final_installer_path.is_file():
        raise InstallerShellBuildError(f"未找到 NSIS 安装包: {final_installer_path}")

    compiler_path = find_csharp_compiler()
    core_installer_path.unlink(missing_ok=True)
    shell_output_path.unlink(missing_ok=True)
    final_installer_path.replace(core_installer_path)

    try:
        result = compile_installer_shell(
            project_directory,
            compiler_path,
            core_installer_path,
            shell_output_path,
        )
        if not result.success:
            details = json.dumps(asdict(result), ensure_ascii=False, indent=2)
            raise InstallerShellBuildError("安装外壳编译失败:\n" + details)
        if not shell_output_path.is_file() or shell_output_path.stat().st_size <= core_installer_path.stat().st_size:
            raise InstallerShellBuildError("安装外壳产物不完整，内嵌安装核心校验失败。")

        shell_output_path.replace(final_installer_path)
        core_installer_path.unlink()
        remove_stale_update_metadata(release_directory, artifact_name)
        return final_installer_path
    except Exception:
        shell_output_path.unlink(missing_ok=True)
        if core_installer_path.is_file() and not final_installer_path.exists():
            core_installer_path.replace(final_installer_path)
        raise


def main() -> int:
    """Build the installer shell and print a concise machine-readable result."""

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")

    project_directory = Path(__file__).resolve().parent.parent
    try:
        output_path = build_installer_shell(project_directory)
    except (InstallerShellBuildError, OSError) as error:
        print(json.dumps({"success": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1

    print(
        json.dumps(
            {
                "success": True,
                "output": str(output_path),
                "size": output_path.stat().st_size,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
