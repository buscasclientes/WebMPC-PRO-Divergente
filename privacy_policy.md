# Privacy Policy for WebMCP – Model Context Tool Inspector

**Last updated: May 23, 2026**

This Privacy Policy describes how WebMCP ("we", "us", "our") handles data within the WebMCP – Model Context Tool Inspector Chrome Extension.

## 1. Data Collection and Transmission
We value your privacy. WebMCP does **not** collect, track, or store any personal data on external servers. We do not operate any database or central server that receives your private data, API keys, or web activity. 

All network calls made by the extension go directly from your browser to:
- The AI API endpoints you configure (Google Gemini, Anthropic Claude, or OpenAI).
- The local or remote Model Context Protocol (MCP) WebSocket server endpoints that you explicitly configure and connect to.

## 2. Locally Stored Data
The following data is stored exclusively on your local device using Chrome's secure storage API (`chrome.storage.local`):

- **API Keys**: Stored encrypted in your local browser using AES-256-GCM via the Web Crypto API. These keys are only decrypted in memory when making direct API requests to the respective provider.
- **MCP Server Configurations**: The WebSocket URLs of the servers you connect to, saved locally.
- **Request Logs and History**: A record of your recent prompts, model responses, tokens consumed, and connection metrics. This history is kept locally on your machine for debugging and reference. It is never uploaded or shared with us or any third party.
- **Extension Settings**: User preferences (e.g., debug mode toggle, UI theme settings).

## 3. Web Page Content Access
WebMCP includes web page context extraction capabilities. It can read the contents of your active browser tab **only when you explicitly trigger** context actions, such as:
- Clicking the "Extract" button in the Side Panel.
- Using keyboard shortcuts (`Alt + E` or `Alt + S`) to capture page content or selections.

This extracted text is sent directly to the AI service provider you have chosen to answer your prompt. It is not monitored, stored, or processed by WebMCP.

## 4. Third-Party Services
When using WebMCP, your prompts and extracted web content are processed by the third-party AI provider you configure:
- **Google Gemini**: Governed by Google's Privacy Policy.
- **Anthropic Claude**: Governed by Anthropic's Privacy Policy.
- **OpenAI**: Governed by OpenAI's Privacy Policy.

We recommend reviewing the privacy policies of these third parties to understand how they process data.

## 5. Data Deletion
You have complete control over your data. You can delete all data stored by WebMCP at any time by:
- Clicking "Clear Storage" or "Reset" in the Config/History screens.
- Uninstalling the WebMCP Extension from Google Chrome (which automatically removes all local storage data associated with the extension).

## 6. Contact Information
If you have any questions or feedback regarding this Privacy Policy, please contact the developer at:
- **Email**: privacy-webmcp@domain.com
- **Project Repository**: [GitHub WebMCP Extension](https://github.com/dario/WebMCP-Extension)
