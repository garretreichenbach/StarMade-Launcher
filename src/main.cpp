#include "mainwindow.h"
#include <GL/glew.h>
#ifdef _WIN32
#include <windows.h>
#include <windef.h>
#define GLFW_EXPOSE_NATIVE_WIN32
#define GLFW_EXPOSE_NATIVE_WGL
#endif
#include <GLFW/glfw3.h>
#include <GLFW/glfw3native.h>
#include <memory>
#include <iostream>
#include "fontrenderer.h"

void scrollCallback(GLFWwindow* window, double xOffset, double yOffset)
{
    if (MainWindow::getInstance() != nullptr)
    {
        MainWindow::getInstance()->mouseWheelScrolled(xOffset, yOffset);
    }
}

void mouseButtonCallback(GLFWwindow* window, int button, int action, int mods)
{
    if (MainWindow::getInstance() != nullptr)
    {
        MainWindow::getInstance()->mouseClicked(button, action == GLFW_PRESS);
    }
}

void mousePositionCallback(GLFWwindow* window, double xPos, double yPos)
{
    if (MainWindow::getInstance() != nullptr)
    {
        MainWindow::getInstance()->mouseMoved(xPos, yPos);
    }
}

void keyCallback(GLFWwindow* window, int key, int scancode, int action, int mods)
{
    if (MainWindow::getInstance() != nullptr)
    {
        MainWindow::getInstance()->keyPressed(key, action, mods);
    }
}

void charTypedCallback(GLFWwindow* window, unsigned int codePoint, int mods)
{
    if (MainWindow::getInstance() != nullptr)
    {
        MainWindow::getInstance()->charTyped(codePoint, mods);
    }
}

int main(int argc, char *argv[])
{
    GLFWwindow* window;
    if (!glfwInit())
    {
        return -1;
    }

    const int windowSizeX = 1200;
    const int windowSizeY = 750;
    window = glfwCreateWindow(windowSizeX, windowSizeY, "StarMade Launcher", NULL, NULL);

    glfwSetMouseButtonCallback(window, &mouseButtonCallback);
    glfwSetCursorPosCallback(window, &mousePositionCallback);
    glfwSetScrollCallback(window, &scrollCallback);
    glfwSetKeyCallback(window, &keyCallback);
    glfwSetCharModsCallback(window, &charTypedCallback);

    int borderSizeX = 0;

    // Remove window "Decoration" on windows
    // http://stackoverflow.com/questions/2398746/removing-window-border
#ifdef _WIN32
    HWND hwnd = glfwGetWin32Window(window);

    RECT windowRect;
    GetWindowRect(hwnd, &windowRect);

    RECT clientRect;
    GetClientRect(hwnd, &clientRect);

    borderSizeX = ((windowRect.right - windowRect.left) - (clientRect.right - clientRect.left)) / 2;

    LONG lStyle = GetWindowLong(hwnd, GWL_STYLE);
    lStyle &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZE | WS_MAXIMIZE | WS_SYSMENU);
    SetWindowLong(hwnd, GWL_STYLE, lStyle);

    LONG lExStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
    lExStyle &= ~(WS_EX_DLGMODALFRAME | WS_EX_CLIENTEDGE | WS_EX_STATICEDGE);
    SetWindowLong(hwnd, GWL_EXSTYLE, lExStyle);

    SetWindowPos(hwnd, NULL, 0,0,windowSizeX,windowSizeY, SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOZORDER | SWP_NOOWNERZORDER);
#endif // _WIN32


    glfwMakeContextCurrent(window);

    std::vector<FontListEntry> fontList;
    fontList.push_back(FontListEntry::BABAS_NEUE_12);
    fontList.push_back(FontListEntry::BABAS_NEUE_16);
    fontList.push_back(FontListEntry::BABAS_NEUE_24);
    fontList.push_back(FontListEntry::BABAS_NEUE_32);
    fontList.push_back(FontListEntry::BABAS_NEUE_64);
    fontList.push_back(FontListEntry::MARCELLUS_12);
    fontList.push_back(FontListEntry::MARCELLUS_16);
    fontList.push_back(FontListEntry::MARCELLUS_24);
    fontList.push_back(FontListEntry::MARCELLUS_32);
    fontList.push_back(FontListEntry::MARCELLUS_64);
    fontList.push_back(FontListEntry::BLENDER_PRO_12);
    fontList.push_back(FontListEntry::BLENDER_PRO_16);
    fontList.push_back(FontListEntry::BLENDER_PRO_24);
    fontList.push_back(FontListEntry::BLENDER_PRO_32);
    fontList.push_back(FontListEntry::BLENDER_PRO_64);
    fontList.push_back(FontListEntry::BLENDER_PRO_BOLD_12);
    fontList.push_back(FontListEntry::BLENDER_PRO_BOLD_16);
    fontList.push_back(FontListEntry::BLENDER_PRO_BOLD_24);
    fontList.push_back(FontListEntry::BLENDER_PRO_BOLD_32);
    fontList.push_back(FontListEntry::BLENDER_PRO_BOLD_64);
    FontRenderer::init(fontList);

    MainWindow::newInstance(borderSizeX, 0);
    MainWindow::getInstance()->resize(windowSizeX, windowSizeY);
    MainWindow::getInstance()->init();
    //w.checkJavaVersion(3);

    double lastTime = glfwGetTime();
    while (!glfwWindowShouldClose(window) && !MainWindow::getInstance()->isCloseRequested())
    {
        MainWindow::getInstance()->update(glfwGetTime() - lastTime);
        MainWindow::getInstance()->render();

        glfwSwapBuffers(window);
        glfwPollEvents();
        lastTime = glfwGetTime();
        if (MainWindow::getInstance()->isMinimizeRequested())
        {
            glfwIconifyWindow(window);
            MainWindow::getInstance()->setMinimizeRequested(false);
        }
        Vector2I moveVec = MainWindow::getInstance()->getWindowMoveRequest();
        if (moveVec.x() != 0 && moveVec.y() != 0)
        {
            int posX, posY;
            glfwGetWindowPos(window, &posX, &posY);
            glfwSetWindowPos(window, posX + moveVec.x(), posY + moveVec.y());
            MainWindow::getInstance()->setWindowMoveRequest(Vector2I(0, 0));
        }
    }

    glfwTerminate();

    return 0;
}
