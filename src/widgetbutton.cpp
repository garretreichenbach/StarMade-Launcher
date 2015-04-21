#include "widgetbutton.h"
#include "fontrenderer.h"
#include <iostream>

WidgetButton::WidgetButton(const std::string& text,
                        int callbackIndex,
                        FontListEntry font,
                        IButtonCallback* callback,
                        LauncherWidget* parent)
    : WidgetPane(parent),
    m_callback(callback),
    m_isHovered(false),
    m_text(text),
    m_font(font),
    m_callbackIndex(callbackIndex)
{
}

WidgetButton::~WidgetButton()
{
    if (m_callback != nullptr)
    {
        delete m_callback;
    }
}

void WidgetButton::draw()
{
    WidgetPane::draw();
    Vector2F textSize = FontRenderer::getTextSize(m_font, m_text);
    FontRenderer::renderText(m_font, m_text, Vector2I(getPosition().x() + getSize().x() / 2 - textSize.x() / 2, getPosition().y() + getSize().y() / 2 + textSize.y() / 2));
}

void WidgetButton::init()
{
    WidgetPane::init();
}

void WidgetButton::update(double delta)
{
}

void WidgetButton::mouseMoved(Vector2D newPos)
{
    LauncherWidget::mouseMoved(newPos);

    if (newPos.x() >= getPosition().x() &&
        newPos.x() <= getPosition().x() + getSize().x() &&
        newPos.y() >= getPosition().y() &&
        newPos.y() <= getPosition().y() + getSize().y())
    {
        m_isHovered = true;
    }
    else
    {
        m_isHovered = false;
    }
}

void WidgetButton::mouseClicked(Vector2D clickPos, int button, bool press)
{
    LauncherWidget::mouseClicked(clickPos, button, press);

    if (button == 0 && press && clickPos.x() >= getPosition().x() &&
        clickPos.x() <= getPosition().x() + getSize().x() &&
        clickPos.y() >= getPosition().y() &&
        clickPos.y() <= getPosition().y() + getSize().y())
    {
        if (m_callback != nullptr)
        {
            m_callback->buttonClicked(this, m_callbackIndex);
        }
    }
}
