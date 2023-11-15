sap.ui.define([
    "../controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter"
], function (BaseController, JSONModel, History, Filter, FilterOperator, formatter) {
    "use strict";

    let that,
        viewModel,
        facturaModel,
        ODATA_SAP;

    return BaseController.extend("usil.com.createinvoice.detalle.Detalle", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit: function () {
            that = this;
            // Model used to manipulate control states. The chosen values make sure,
            // detail page shows busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            viewModel = new JSONModel({
                busy: true,
                delay: 0
            });

            facturaModel = this.getOwnerComponent().getModel("facturaModel");
            ODATA_SAP = this.getOwnerComponent().getModel("ODATA_SAP");
            this.getRouter().getRoute("detalle").attachPatternMatched(this._onDetalletMatched, this);
            this.setModel(viewModel, "detalleView");
        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */


        /**
         * Event handler  for navigating back.
         * It there is a history entry we go one step back in the browser history
         * If not, it will replace the current entry of the browser history with the worklist route.
         * @public
         */
        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();
            if (sPreviousHash !== undefined) {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            } else {
                this.getRouter().navTo("solicitudes", {}, true);
            }
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Binds the view to the object path.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onDetalletMatched: function (oEvent) {
            if (that.getOwnerComponent().getModel("oCabecera")) {
                let oObject = that.getOwnerComponent().getModel("oCabecera").getData();
                oObject.codigo = "20297868790";
                oObject.proveedor = "Indra Peru S.A.";
                oObject.total = (Number(oObject.NETWR) * Number(oObject.IGV)).toFixed(2);
                //that.mostrarDetalle(oObject.CODEFACT);
                that.getOwnerComponent().getModel("oCabecera").refresh(true);
                const resourceBundle = this.getResourceBundle();
                viewModel.setProperty("/detalleViewTitle", resourceBundle.getText("detalleViewTitle", [oObject.CODEFACT]));
                viewModel.setProperty("/busy", false);
                viewModel.setProperty("/busy", false);
            } else {
                viewModel.setProperty("/busy", false);
                that.onNavBack();
            }

            // var codigoSolicitud =  oEvent.getParameter("arguments").codigoSolicitud;
            // facturaModel.metadataLoaded().then( function () {
            //     const detailPath = facturaModel.createKey("Facturas",{
            //         codigoSolicitud: codigoSolicitud
            //     });
            //     this._bindView("/" + detailPath);
            // }.bind(this));
        },

        /**
         * Binds the view to the object path.
         * @function
         * @param {string} sObjectPath path to the object to be bound
         * @private
         */
        _bindView: function (sObjectPath) {
            this.getView().bindElement({
                path: sObjectPath,
                model: "facturaModel",
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        viewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        viewModel.setProperty("/busy", false);
                    }
                }
            });
        },

        _onBindingChange: function () {
            const oView = this.getView(),
                oElementBinding = oView.getElementBinding("facturaModel"),
                contexto = oElementBinding.getBoundContext();

            // No data for the binding
            if (!contexto) {
                this.getRouter().getTargets().display("objectNotFound");
                return;
            }

            const resourceBundle = this.getResourceBundle();
            const codigoSolicitud = contexto.getObject().codigoSolicitud;
            viewModel.setProperty("/detalleViewTitle", resourceBundle.getText("detalleViewTitle", [codigoSolicitud]));
            viewModel.setProperty("/busy", false);
        },

        mostrarDetalle: function (sCODEFACT) {
            sap.ui.core.BusyIndicator.show(0);
            let aFilters = [];
            let oFilter = new Filter("is_fact_prov_c", FilterOperator.EQ, sCODEFACT);
            aFilters.push(oFilter);

            ODATA_SAP.read("/listarDetalleFacturaSet", {
                filters: aFilters,
                success: function (data) {
                    sap.ui.core.BusyIndicator.hide();
                    let sJson = data.results[0].et_data;
                    let aLista = JSON.parse(sJson);
                    console.log(aLista);
                    let oModelLista = new JSONModel(aLista);
                    that.byId("reviewTable").setModel(oModelLista);
                },
                error: function (err) {
                    var error = err;
                    console.log(error);
                    MessageBox.error("Error al listar el detalle de la factura");
                    sap.ui.core.BusyIndicator.hide();
                }
            });
        }
    });

});
