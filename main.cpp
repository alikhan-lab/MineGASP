#define UNICODE
#define _UNICODE
#include <windows.h>
#include <string>

#define ID_BTN_START 1
#define ID_EDIT_IP 2
#define ID_EDIT_PORT 3
#define ID_EDIT_BOTNAME 4 
#define ID_EDIT_USERNAME 5 
#define ID_EDIT_KEY 6

HWND hIp, hPort, hBotName, hUserName, hKey;
HBRUSH hBackBrush;

void LaunchBot() {
    wchar_t ip[256], port[256], bName[256], uName[256], key[1024];
    GetWindowTextW(hIp, ip, 256);
    GetWindowTextW(hPort, port, 256);
    GetWindowTextW(hBotName, bName, 256);
    GetWindowTextW(hUserName, uName, 256);
    GetWindowTextW(hKey, key, 1024);

    // Собираем параметры в одну строку для cmd
    std::wstring params = L"/c node body.js " + std::wstring(ip) + L" " + 
                         std::wstring(port) + L" " + std::wstring(bName) + L" " + 
                         std::wstring(uName) + L" " + std::wstring(key);
    
    // Запуск через cmd.exe
    ShellExecuteW(NULL, L"open", L"cmd.exe", params.c_str(), NULL, SW_SHOW);
}

LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    switch (uMsg) {
        case WM_CTLCOLORSTATIC:
            SetTextColor((HDC)wParam, RGB(220, 220, 220));
            SetBkColor((HDC)wParam, RGB(45, 45, 45));
            return (LRESULT)hBackBrush;
        case WM_CREATE: {
            hBackBrush = CreateSolidBrush(RGB(45, 45, 45));
            HFONT hFont = CreateFontW(18, 0, 0, 0, FW_LIGHT, 0, 0, 0, 0, 0, 0, CLEARTYPE_QUALITY, 0, L"Segoe UI");
            int y = 15, x = 20, w = 340;

            auto AddLabel = [&](const wchar_t* text) {
                HWND lbl = CreateWindowW(L"STATIC", text, WS_VISIBLE | WS_CHILD, x, y, w, 20, hwnd, NULL, NULL, NULL);
                SendMessage(lbl, WM_SETFONT, (WPARAM)hFont, TRUE);
                y += 22;
            };

            AddLabel(L"IP Сервера:");
            hIp = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"127.0.0.1", WS_VISIBLE | WS_CHILD, x, y, w, 28, hwnd, (HMENU)ID_EDIT_IP, NULL, NULL); y += 45;
            
            AddLabel(L"Порт:");
            hPort = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"25565", WS_VISIBLE | WS_CHILD, x, y, w, 28, hwnd, (HMENU)ID_EDIT_PORT, NULL, NULL); y += 45;

            AddLabel(L"Как назвать бота:");
            hBotName = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"SmaG", WS_VISIBLE | WS_CHILD, x, y, w, 28, hwnd, (HMENU)ID_EDIT_BOTNAME, NULL, NULL); y += 45;

            AddLabel(L"Твой ник в игре:");
            hUserName = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"Player", WS_VISIBLE | WS_CHILD, x, y, w, 28, hwnd, (HMENU)ID_EDIT_USERNAME, NULL, NULL); y += 45;

            AddLabel(L"API Ключ (Виден):");
            // УБРАЛ ES_PASSWORD — теперь ключ видно при вводе
            hKey = CreateWindowExW(WS_EX_CLIENTEDGE, L"EDIT", L"", WS_VISIBLE | WS_CHILD | ES_AUTOHSCROLL, x, y, w, 28, hwnd, (HMENU)ID_EDIT_KEY, NULL, NULL); y += 50;

            HWND btn = CreateWindowW(L"BUTTON", L"ЗАПУСТИТЬ", WS_VISIBLE | WS_CHILD | BS_FLAT, x, y, w, 45, hwnd, (HMENU)ID_BTN_START, NULL, NULL);
            SendMessage(btn, WM_SETFONT, (WPARAM)hFont, TRUE);
            break;
        }
        case WM_COMMAND: if (LOWORD(wParam) == ID_BTN_START) LaunchBot(); break;
        case WM_DESTROY: PostQuitMessage(0); break;
    }
    return DefWindowProcW(hwnd, uMsg, wParam, lParam);
}

int WINAPI WinMain(HINSTANCE hI, HINSTANCE, LPSTR, int nS) {
    WNDCLASSW wc = {0}; wc.lpfnWndProc = WindowProc; wc.hInstance = hI; wc.lpszClassName = L"SmaG_UI";
    wc.hbrBackground = CreateSolidBrush(RGB(45, 45, 45)); wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    RegisterClassW(&wc);
    HWND hwnd = CreateWindowExW(0, L"SmaG_UI", L"SmaG Control Panel", WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU, 100, 100, 400, 520, 0, 0, hI, 0);
    ShowWindow(hwnd, nS);
    MSG msg; while (GetMessageW(&msg, 0, 0, 0)) { TranslateMessage(&msg); DispatchMessageW(&msg); }
    return 0;
}