// error handling  extension that allows for error output and exception calls
(function(factory)
{
	"use strict";

	if (typeof define === 'function' && define.amd)
    {
        define(['jquery'], factory);
    }
    else 
    {
        factory(jQuery);
    }
}(function($)
{
	"use strict";

	var m_Handler = window.console,
    m_debug = false;
    
    $.ViCoWaErrorHandler = 
    {
        /// Set the debug state
        /// @param p_Debug : boolean to indicate if we are debugging (true) or not (false)
        setDebug : function(p_Debug)
        {
            m_debug = p_Debug;
        },
        
        /// Get the debug state
        /// @return true when debugging or false when not
        isDebug : function()
        {
            return m_debug;
        },

        /// Set a error handler function, defaults to using the console if it exists
        setHandler : function(p_Handler)
        {
            m_Handler = p_Handler;    
        },

        /// show the given error message using the default error handler
        /// @param p_ErrorMessage : The error message to be shown
        /// @param p_ErrorObject : Object with additional error info
        showError : function(p_ErrorMessage, p_ErrorObject) 
        {
            m_Handler && m_Handler(p_ErrorMessage, p_ErrorObject);
        },
        
        /// Call the given function within a try catch, that will by default continue on after showing a message
        tryCatchCall : function(p_Function, p_Options)
        {
            var Options = $.extend({}, 
            {
                console: true,
                catcher: null
            }, p_Options);
            
            try
            {
                p_Function();
            }
            catch(err)
            {
                var ErrorObject = 
                {
                    err: err,
                    name: "",
                    message: "",
                    stack: "",
                    fileName: "unknown source",
                    lineNumber: -1
                };
                
                var ErrObject = err;
                
                if (typeof ErrObject !== "object")
                {
                    ErrObject = new Error(err);
                }
                
                var Name = ErrObject.name || "error";
                var Message = ErrObject.message || ErrObject.description || ErrObject;

                if (Options.console && window.console)
                {
                    console.error(Message);
                    console.log("Error stack is : " + ErrObject.stack);
                }
                $.extend(ErrorObject, {
                    name: Name,
                    message: Message,
                    stack: ErrObject.stack,
                    fileName: ErrObject.fileName || "unknown source",
                    lineNumber: (typeof ErrObject.lineNumber !== "undefined") ? ErrObject.lineNumber : -1
                });
                this.showError(Name + ": " + Message, ErrorObject);
                
                if (Options.catcher)
                {
                    Options.catcher(ErrObject, ErrorObject);
                }
            }
        }
    };
}));

