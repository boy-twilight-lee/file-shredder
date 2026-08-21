from __future__ import annotations

import ctypes
import json
from ctypes import wintypes


def main() -> None:
    user32 = ctypes.windll.user32
    target_pid = 14500
    windows: list[dict[str, object]] = []

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def collect_window(window_handle: int, _: int) -> bool:
        process_id = wintypes.DWORD()
        user32.GetWindowThreadProcessId(window_handle, ctypes.byref(process_id))
        if process_id.value != target_pid:
            return True
        bounds = wintypes.RECT()
        user32.GetWindowRect(window_handle, ctypes.byref(bounds))
        title_length = user32.GetWindowTextLengthW(window_handle)
        title = ctypes.create_unicode_buffer(title_length + 1)
        user32.GetWindowTextW(window_handle, title, title_length + 1)
        windows.append({
            "handle": window_handle,
            "title": title.value,
            "visible": bool(user32.IsWindowVisible(window_handle)),
            "rect": [bounds.left, bounds.top, bounds.right, bounds.bottom],
            "dpi": user32.GetDpiForWindow(window_handle),
        })
        return True

    cursor = wintypes.POINT()
    user32.GetCursorPos(ctypes.byref(cursor))
    user32.EnumWindows(collect_window, 0)
    print(json.dumps({"cursor": [cursor.x, cursor.y], "windows": windows}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
