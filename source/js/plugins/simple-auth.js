import { elt } from '../utils/elt';

/**
 * A simple authentication plugin. 
 * 
 * Based on parts of IIIF-Auth API but with access control on the manifest. 
 * 
 * Requires IIIF-Auth API compliant Access Cookie Service (settings.simpleAuthLoginUrl)
 * and Access Token Service (settings.simpleAuthTokenUrl).
 * (see https://iiif.io/api/auth/1.0/)
 * 
 * 1. Diva tries to load the manifest normally.
 * 2. If loading the manifest fails with an authorization error the plugin requests an access token.
 * 3. If loading the access token fails the plugin shows a login dialog and requests a new token.
 * 4. Diva tries to load the manifest with the access token.
 * 5. If loading the manifest fails with the access token goto 3.
 * 6. The images are loaded using the cookies set by the login domain.
 *  
 **/
export default class SimpleAuthPlugin
{
    constructor (core)
    {
        this.core = core;
        this.authTokenUrl = core.settings.simpleAuthTokenUrl;
        this.authLoginUrl = core.settings.simpleAuthLoginUrl;
        this.authToken = null;
        this.authError = null;
        this.authTokenId = null;
        this.serviceOrigin = this.getOrigin(this.authTokenUrl);
        
        // unset imageCrossOrigin because we need cookies on the image requests
        core.publicInstance.options.imageCrossOrigin = null;

        /*
         * Manifest load error handler.
         * 
         * Re-tries load with auth token or shows log in window. 
         */
        Diva.Events.subscribe('ManifestFetchError', (response) => {
            if (response.status === 401) {
                if (this.authToken === null && this.authError === null) {
                    // no auth token. let's get one
                    this.requestAuthToken();
                    // abort regular error handling
                    throw new Error('Authentication required. Retrying with token.');
                } else {
                    // auth token doesn't work. try to log in again
                    this.showLoginMessage(response);
                    // abort regular error message
                    throw new Error('Authentication required. Retrying with login.');
                }
            }
        }, core.settings.ID);
        
        /*
         * postMessage event handler.
         * 
         * Receives data from IIIF-Auth token service in iframe.
         * (https://iiif.io/api/auth/1.0/#interaction-for-browser-based-client-applications)
         */
        window.addEventListener('message', (event) => {
            let origin = event.origin;
            let data = event.data;
            //console.debug("received postMessage!", origin, data);
            
            if (origin !== this.serviceOrigin) return;
            
            if (data.messageId !== this.authTokenId) return;
            
            if (data.hasOwnProperty('accessToken')) 
            {
                this.authToken = data.accessToken;
                this.authError = null;
                this.setAuthHeader(data.accessToken);
                // reload manifest
                this.core.publicInstance._loadOrFetchObjectData();
            } 
            else if (data.hasOwnProperty('error')) 
            {
                // handle error condition
                //console.debug("ERROR getting access token!");
                this.authError = data.error;
                this.authToken = null;
                this.setAuthHeader(null);
                // reload manifest to trigger login window
                this.core.publicInstance._loadOrFetchObjectData();
            }
        });
    }

    /**
     * Show login required message with button to open login window.
     */
    showLoginMessage (response)
    {
        const errorMessage = ['Unauthorized request. Error code: ' + response.status + ' ' + response.statusText];
        errorMessage.push(
            elt('p', 'The document you are trying to access requires authentication.'),
            elt('p', 'Please ',
                elt('button', this.core.elemAttrs('error-auth-login', {'aria-label': 'Log in'}), 'log in')
            ));
        
        this.core.showError(errorMessage);
        
        // connect login button
        let selector = '#' + this.core.settings.selector;
        document.querySelector(selector + 'error-auth-login').addEventListener('click', () =>
        {
            this.openLoginWindow();
            // close error message
            let errorElement =  document.querySelector(selector + 'error');
            errorElement.parentNode.removeChild(errorElement);
        });
    }

    /**
     * Open new window with login url and re-request token after it closes.
     */
    openLoginWindow () 
    {
        const loginWindow = window.open(this.authLoginUrl);
        
        if (!loginWindow) 
        {
            console.error("login service window did not open :-(");
            return;
        }
        
        // we need to wait for the window to close...
        const poll = window.setInterval( () => {
            if (loginWindow.closed) 
            {
                window.clearInterval(poll);
                // request a token with the new cookies
                this.requestAuthToken();
            }
        }, 500);
    }
    
    /**
     * Request a new authentication token.
     * 
     * Creates iframe with the token service url.
     * Should trigger receiveMessage with the token.
     */
    requestAuthToken ()
    {
        const tokenFrameId = 'iiif-token-frame';
        let tokenFrame = document.getElementById(tokenFrameId);
        if (tokenFrame == null) 
        {
            tokenFrame = document.createElement('iframe');
            tokenFrame.id = tokenFrameId;
            tokenFrame.setAttribute('style', 'display:none; width:30px; height:10px;');
            document.body.appendChild(tokenFrame);
        }

        // use utime as token id
        this.authTokenId = Date.now().toString();
        // create url with id and origin
        const tokenUrl = this.authTokenUrl + '?messageId=' + this.authTokenId + '&origin=' + this.getOrigin();
        // load url in iframe
        tokenFrame.src = tokenUrl;
    }

    /**
     * Determine the postMessage-style origin for a URL.
     */ 
    getOrigin (url) 
    {
        let urlHolder = window.location;
        if (url) 
        {
            urlHolder = document.createElement('a');
            urlHolder.href = url;
        }
        return urlHolder.protocol + '//' + urlHolder.hostname + (urlHolder.port ? ':'+urlHolder.port : '');
    }
    
    /**
     * Set the Authorization header.
     */
    setAuthHeader (token) 
    {
        if (token !== null)
        {
            this.core.settings.requestHeaders['Authorization'] = 'Bearer ' + token;
        }
        else
        {
            delete this.core.settings.requestHeaders['Authorization'];
        }
    }
}

SimpleAuthPlugin.prototype.pluginName = 'simple-auth';
SimpleAuthPlugin.prototype.isPageTool = false;

/**
 * Make this plugin available in the global context
 * as part of the 'Diva' namespace.
 **/
(function (global)
{
    global.Diva.SimpleAuthPlugin = SimpleAuthPlugin;
})(window);
