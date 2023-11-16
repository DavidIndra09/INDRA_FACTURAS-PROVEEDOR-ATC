sap.ui.define([
    "./BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("usil.com.createinvoice.controller.App", {

        onInit: function () {
            // apply content density mode to root view
            this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());

            this._getDataInitial();
        },


        _getDataInitial: async function () {
            const model = this.getModel();
            model.setProperty("/nodes", [
                {
                    "id": "1",
                    "lane": "0",
                    "title": "Primer Aprobador",
                    "titleAbbreviation": "#1",
                    "children": [10],
                    "state": "Positive",
                    "stateText": "OK status",
                    "focused": false,
                    "highlighted": false,
                    "texts": ["De acuerdo", "Se lo Merecía"]
                }, {
                    "id": "10",
                    "lane": "1",
                    "title": "Segundo Aprobador",
                    "titleAbbreviation": "#2",
                    "children": [20],
                    "state": "Negative",
                    "stateText": "Rechazado",
                    "focused": false,
                    "highlighted": false,
                    "texts": ["En Desacuerdo ", "Conversarlo con el Supervisor"]
                }, {
                    "id": "20",
                    "lane": "2",
                    "title": "Último Aprobador",
                    "titleAbbreviation": "#3",
                    "children": [],
                    "state": "Critical",
                    "stateText": "Pendiente",
                    "focused": false,
                    "highlighted": false,
                    "texts": null
                }
            ]);
            model.setProperty("/lanes", [
                {
                    "id": "0",
                    "icon": "sap-icon://hr-approval",
                    "label": "Nivel de Aprobación 1",
                    "position": 0
                }, {
                    "id": "1",
                    "icon": "sap-icon://hr-approval",
                    "label": "Nivel de Aprobación 2",
                    "position": 1
                }, {
                    "id": "2",
                    "icon": "sap-icon://payment-approval",
                    "label": "Nivel de Aprobación 3",
                    "position": 2
                }
            ])
        }
    });

});