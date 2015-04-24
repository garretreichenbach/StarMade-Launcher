#include "oauthcontroller.h"
#include <curl/curl.h>
#include <iostream>
#include <string>
#include <rapidjson/document.h>
#include <rapidjson/writer.h>
#include <rapidjson/stringbuffer.h>
#include <glfw/glfw3.h>
#include "platformutil.h"
#include "connectionutil.h"
#include "mainwindow.h"
#include "messagebox.h"

OAuthController::OAuthController()
{
    //ctor
}

OAuthController::~OAuthController()
{
    //dtor
}


/**
  * Make a login request
  */
std::string OAuthController::loginRequest(const std::string& username, const std::string& password)
{
    const std::string tokenServerUrl("https://registry.star-made.org/oauth/token");

    curl_global_init(CURL_GLOBAL_ALL);
    CURL *curl;
    CURLcode res;
    ConnectionUtil::BufferStruct output;

    curl = curl_easy_init();
    if (curl)
    {
        char* grant_type = curl_easy_escape(curl, "grant_type", 0);
        char* grant_type_value = curl_easy_escape(curl, "password", 0);
        char* user_name = curl_easy_escape(curl, "username", 0);
        char* user_name_value = curl_easy_escape(curl, username.c_str(), 0);
        char* password_encoded = curl_easy_escape(curl, "password", 0);
        char* password_encoded_value = curl_easy_escape(curl, password.c_str(), 0);
        char* scope = curl_easy_escape(curl, "scope", 0);
        char* scope_value = "public+read_citizen_info+client";
        std::string fullPostFields(std::string(grant_type) + "=" + std::string(grant_type_value) + "&" +
                              std::string(user_name) + "=" + std::string(user_name_value) + "&" +
                              std::string(password_encoded) + "=" + std::string(password_encoded_value) + "&" +
                              std::string(scope) + "=" + std::string(scope_value));

        ConnectionUtil::setWriteOptions(curl, output);
        curl_easy_setopt(curl, CURLOPT_URL, tokenServerUrl.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, fullPostFields.c_str());
        curl_easy_setopt(curl, CURLOPT_CAINFO, "ca-bundle.crt");
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, true);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 2);
        res = curl_easy_perform(curl);

        if (res != CURLE_OK)
        {
            MainWindow::getInstance()->addMessageBox(std::shared_ptr<LauncherMessageBox>(new LauncherMessageBox("Error",
                                                                                                                "Connection error! curl(" + std::to_string(res) + ")",
                                                                                                                Vector2I(200, 100),
                                                                                                                { new MessageBoxButton(0, "OK") },
                                                                                                                { },
                                                                                                                glfwGetTime(),
                                                                                                                new OAuthController())));
            PlatformUtil::messageBox("Connection error! curl(%i)", res);
        }

        long http_code = 0;
        curl_easy_getinfo (curl, CURLINFO_RESPONSE_CODE, &http_code);

        if (http_code == 401)
        {
            MainWindow::getInstance()->addMessageBox(std::shared_ptr<LauncherMessageBox>(new LauncherMessageBox("Error",
                                                                                                                "Invalid Credentials",
                                                                                                                Vector2I(500, 200),
                                                                                                                { new MessageBoxButton(0, "OK"),
                                                                                                                  new MessageBoxButton(1, "Cancel") },
                                                                                                                { new MessageBoxTextWidget(2, Vector2I(400, 30), Vector2I(0, 0), true) },
                                                                                                                glfwGetTime(),
                                                                                                                new OAuthController())));
            return "";
        }

        curl_free(grant_type);
        curl_free(user_name);
        curl_free(user_name_value);
        curl_free(password_encoded);
        curl_free(password_encoded_value);
        curl_free(scope);

        curl_easy_cleanup(curl);

        if (output.buffer != nullptr)
        {
            rapidjson::Document d;
            d.Parse(output.buffer);

            rapidjson::Value& s = d["access_token"];
            return s.GetString();
        }

        return 0;
    }
}

void OAuthController::buttonClicked(int callbackIndex)
{
    if (callbackIndex < 2)
    {
        MainWindow::getInstance()->removeCurrentMessageBox();
    }
}
