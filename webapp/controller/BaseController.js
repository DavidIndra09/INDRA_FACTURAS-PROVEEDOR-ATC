sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/m/library"
], function (Controller, UIComponent, mobileLibrary) {
    "use strict";

    // shortcut for sap.m.URLHelper
    var URLHelper = mobileLibrary.URLHelper;

    return Controller.extend("usil.com.createinvoice.controller.BaseController", {
        /**
         * Convenience method for accessing the router.
         * @public
         * @returns {sap.ui.core.routing.Router} the router for this component
         */
        getRouter : function () {
            return UIComponent.getRouterFor(this);
        },

        /**
         * Convenience method for getting the view model by name.
         * @public
         * @param {string} [sName] the model name
         * @returns {sap.ui.model.Model} the model instance
         */
        getModel : function (sName) {
            return this.getView().getModel(sName);
        },

        /**
         * Convenience method for setting the view model.
         * @public
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         */
        setModel : function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        /**
         * Getter for the resource bundle.
         * @public
         * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
         */
        getResourceBundle : function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        readEntity: function(odataModel,path,parameters){
            return new Promise((resolve,reject) => {
                odataModel.read(path,{
                    filters: parameters.filters,
                    urlParameters: parameters.urlParameters,
                    success: resolve,
                    error: reject
                });
            });
        },

        createEntity:function(odataModel,path,data){
            return new Promise((resolve,reject)=>{
                odataModel.create(path,data,{
                    success:resolve,
                    error:reject
                });
            });
        },

        updateEntity:function(odataModel,path,data){
            return new Promise((resolve,reject)=>{
                odataModel.update(path,data,{
                    success:resolve,
                    error:reject
                });
            });
        },

        deleteEntity:function(odataModel,path){
            return new Promise((resolve,reject)=>{
                odataModel.remove(path,{
                    success:resolve,
                    error:reject
                });
            });
        },

        dialogs : {},

        getDialogs : async function (dialogName,controller) {
            let dialog = this.dialogs[dialogName];
            if(!dialog){
                dialog = await controller.loadFragment({
                    name: `usil.com.createinvoice.view.fragments.${dialogName}`
                });
                this.dialogs[dialogName] = dialog;
            }
            return dialog; 
        },
        closeDialog : function (dialogName) {
            const dialog = this.dialogs[dialogName];
            dialog.close();
        }
    });

});