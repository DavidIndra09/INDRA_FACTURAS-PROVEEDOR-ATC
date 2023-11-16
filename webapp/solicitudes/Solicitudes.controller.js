sap.ui.define([
    "../controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "../services/service",
    "sap/ui/core/message/Message",
    "sap/ui/core/routing/History",
    "sap/ui/export/Spreadsheet"
], function (
    BaseController,
    JSONModel,
    formatter,
    Filter,
    FilterOperator,
    MessageBox,
    Service,
    Message,
    History,
    Spreadsheet
) {
    "use strict";

    let that,
        MODEL,
        viewModel,
        viewModelExcel,
        ODataUtilidadesModel,
        facturaModel,
        messageManager,
        ODATA_SAP;

    return BaseController.extend("usil.com.createinvoice.solicitudes.Solicitudes", {

        formatter: formatter,

        /* =========================================================== */
        /* Métodos del ciclo de vida                                   */
        /* =========================================================== */

        /**
         * Método ejecutado cuando se crea la instancia del controlador.
         * @public
         */
        onInit: function () {
            that = this;
            MODEL = this.getOwnerComponent().getModel();
            that.MostrarTablaPorFlujo("Solicitudes");
            // Model used to manipulate control states
            viewModel = new JSONModel({
                solicitudesTableTitle: this.getResourceBundle().getText("solicitudesTableTitle"),
                tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
                tableBusy: true,
                tableBusyDelay: 0
            });

            viewModelExcel = new JSONModel({
                solicitudesTableTitle: this.getResourceBundle().getText("solicitudesTableTitle"),
                tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
                tableBusy: true,
                tableBusyDelay: 0
            });

            facturaModel = this.getOwnerComponent().getModel("facturaModel");
            ODATA_SAP = this.getOwnerComponent().getModel("ODATA_SAP");
            ODataUtilidadesModel = this.getOwnerComponent().getModel("ODataUtilidadesModel");
            messageManager = sap.ui.getCore().getMessageManager();

            this.setModel(viewModel, "solicitudesView");
            this.setModel(viewModelExcel, "ExcelView");
            this.setModel(messageManager.getMessageModel(), "message");
            this.setModel(new JSONModel(this.getEstadosFactura()), "EstadosFactura");

            MODEL.setProperty("/Ordenes", Service.getInstance().newOrdenCompra());
            // MODEL.setProperty("/Tipo",Service.getInstance().newTipo());
            // MODEL.setProperty("/EstadosFactura",Service.getInstance().newEstadofactura());
            MODEL.setProperty("/Busqueda", {});
            that._dialogs = {};
            that.onMostrarSeleccionProveedor();
            // this._getDataInitial();
            this._setListaSolicitudes({ filters: [] });

            this.getRouter().getRoute("solicitudes").attachPatternMatched(this._onSolicitudesMatched, this);
        },

        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Triggered by the table's 'updateFinished' event: after new table
         * data is available, this handler method updates the table counter.
         * This should only happen if the update was successful, which is
         * why this handler is attached to 'updateFinished' and not to the
         * table's list binding's 'dataReceived' method.
         * @param {sap.ui.base.Event} oEvent the update finished event
         * @public
         */
        onUpdateFinished: function (oEvent) {
            // update the worklist's object counter after the table update
            var sTitle,
                oTable = oEvent.getSource(),
                iTotalItems = oEvent.getParameter("total");
            // only update the counter if the length is final and
            // the table is not empty
            if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                sTitle = this.getResourceBundle().getText("solicitudesTableTitleCount", [iTotalItems]);
            } else {
                sTitle = this.getResourceBundle().getText("solicitudesTableTitle");
            }
            viewModel.setProperty("/solicitudesTableTitle", sTitle);
        },

        onNavFacturaNueva: function (event) {
            that.getRouter().navTo("factura", { codigoSolicitud: "N" }, false);
        },


        // onEditarSolicitud : function (event) {
        //     const item = event.getSource();
        //     this.getRouter().navTo("factura",{
        //         numSolicitud: item.getBindingContext().getProperty("codigoSolicitud")
        //     },false);
        // },

        /**
         * Manejador de evento de navegacion hacia detalle o edicion cuando un item de la tabla es presionado
         * @param {sap.ui.base.Event} event
         * @public 
         */
        onDetalleSolicitud: function (event) {
            const contexto = event.getSource().getBindingContext();
            const solicitud = contexto.getObject();
            const codigoSolicitud = contexto.getProperty("CODEFACT");//codigoSolicitud
            let page = "detalle";
            if (solicitud.estadoFactura_ID === 1) {
                page = "factura";
            }
            that.getOwnerComponent().setModel(new JSONModel(solicitud), "oCabecera");
            that.getRouter().navTo(page, {
                codigoSolicitud: codigoSolicitud
            }, true);
        },


        /**
         * Event handler for navigating back.
         * Navigate back in the browser history
         * @public
         */
        onNavBack: function () {
            // eslint-disable-next-line sap-no-history-manipulation
            history.go(-1);
        },

        /**
         * Event handler for refresh event. Keeps filter, sort
         * and group settings and refreshes the list binding.
         * @public
         */
        onRefresh: function () {
            var oTable = this.byId("table");
            oTable.getBinding("items").refresh();
        },

        onSeleccionFechaEmision: function (event) {
            const fechaInicio = event.getSource().getDateValue();
            const fechaFinal = event.getSource().getSecondDateValue();
            MODEL.setProperty("/Busqueda/fechaEmision", {
                fechaInicio: formatter.formatDateParameter(fechaInicio),
                fechaFinal: formatter.formatDateParameter(fechaFinal)
            });
        },
        onSeleccionFechaRegistro: function (event) {
            const fechaInicio = event.getSource().getDateValue();
            const fechaFinal = event.getSource().getSecondDateValue();
            MODEL.setProperty("/Busqueda/fechaRegistro", {
                fechaInicio: formatter.formatDateParameter(fechaInicio),
                fechaFinal: formatter.formatDateParameter(fechaFinal)
            });
        },

        onBuscarFacturas: function () {
            const busqueda = MODEL.getProperty("/Busqueda");
            const filters = [];
            const dFechaEmision = that.byId("idDateRangeEmision"),
                dFechaRegistro = that.byId("idDateRangeRegistro");

            if (dFechaEmision.getValue() !== "") {
                let sFechaIni = dFechaEmision.getDateValue();
                let sFechaFin = dFechaEmision.getSecondDateValue();

                if ((sFechaIni != null && sFechaIni != undefined) && (sFechaFin != null && sFechaFin != undefined)) {
                    filters.push(
                        new Filter("ir_datfa", "BT", formatter.formatDateToString(sFechaIni), formatter.formatDateToString(sFechaFin)) // fechaEmision
                    );
                }
            }

            if (dFechaRegistro.getValue() !== "") {
                let sFechaIni = dFechaRegistro.getDateValue();
                let sFechaFin = dFechaRegistro.getSecondDateValue();

                if ((sFechaIni != null && sFechaIni != undefined) && (sFechaFin != null && sFechaFin != undefined)) {
                    filters.push(
                        new Filter("ir_bedat", "BT", formatter.formatDateToString(sFechaIni), formatter.formatDateToString(sFechaFin)) //fechaRegistro
                    );
                }
            }

            if (busqueda.codigoSolicitud) filters.push(new Filter("ir_solicitud", "EQ", busqueda.codigoSolicitud)); //codigoSolicitud
            if (busqueda.codigoFactura) filters.push(new Filter("ir_codefact", "EQ", busqueda.codigoFactura)); // codigoFactura
            // if(busqueda.fechaEmision) {
            //     filters.push(
            //         new Filter("ir_bedat","BT", busqueda.fechaEmision.fechaInicio , busqueda.fechaEmision.fechaFinal) // fechaEmision
            //     );
            // } 
            if (busqueda.estadoFactura) filters.push(new Filter("i_status", "EQ", busqueda.estadoFactura)); // estadoFactura_ID
            // if(busqueda.fechaRegistro) {
            //     filters.push(
            //         new Filter("fechaRegistro","BT", busqueda.fechaRegistro.fechaInicio , busqueda.fechaRegistro.fechaFinal) // fechaRegistro
            //     );
            // };
            viewModel.setProperty("/tableBusy", true);
            this._setListaSolicitudes({ filters });
        },

        onLimpiarFiltros: function () {
            MODEL.setProperty("/Busqueda", {});
            const dateRangeEmision = this.getView().byId("idDateRangeEmision");
            const dateRangeRegistro = this.getView().byId("idDateRangeRegistro");
            // limpiamos fechas
            dateRangeEmision.setDateValue(null);
            dateRangeEmision.setSecondDateValue(null);
            dateRangeRegistro.setDateValue(null);
            dateRangeRegistro.setSecondDateValue(null);
            viewModel.setProperty("/tableBusy", true);
            this._setListaSolicitudes({ filters: [] });
            this._limpiarItemsSeleccionados();

        },

        onBusquedaRapida: function (event) {
            if (event.getParameters().refreshButtonPressed) {
                // Search field's 'refresh' button has been pressed.
                // This is visible if you select any main list item.
                // In this case no new search is triggered, we only
                // refresh the list binding.
                this.onRefresh();
            } else {
                var aTableSearchState = [];
                var query = event.getParameter("newValue");

                if (query && query.length > 0) {
                    aTableSearchState = [
                        new Filter({
                            filters: [
                                new Filter("CODEFACT", FilterOperator.Contains, query),
                                new Filter("XBLNR", FilterOperator.Contains, query)
                            ],
                            and: false
                        })
                    ];
                }
                this._applySearch(aTableSearchState);
            }
        },

        /**
         * Método para mostrar el detalle del estado de la factura 
         * @param {sap.ui.Event} event 
         */
        onMostrarDetalleEstado: async function (event) {
            const control = event.getSource().getParent();
            const path = control.getBindingContext().getPath();
            const solicitud = control.getBindingContext().getObject();
            MODEL.setProperty("/estadoFactura", solicitud.estadoFactura);
            let vistaRapida = that._dialogs["VistaRapidaEstados"];
            if (!vistaRapida) {
                vistaRapida = await that._getDialogs("VistaRapidaEstados");
            }
            vistaRapida.bindElement(path);
            vistaRapida.close();
            vistaRapida.openBy(control);
        },

        onBorrarSolicitud: function (event) {
            const contexto = event.getSource().getBindingContext();
            const solicitud = contexto.getObject();
            const path = contexto.getPath();
            MessageBox.confirm(`¿Está seguro de eliminar la solicitud ${solicitud.CODEFACT}?`, {
                onClose: async function (action) {
                    if (action === "OK") {
                        // logica temporal
                        // const solicitudes = MODEL.getProperty("/Facturas");
                        const solicitudBorrar = MODEL.getProperty(path);
                        let oParameters = { filters: [] };
                        var oFilterOne = new Filter("is_fact_prov_c", FilterOperator.EQ, solicitudBorrar.CODEFACT);
                        oParameters.filters.push(oFilterOne);
                        var oFilterTwo = new Filter("i_accion", FilterOperator.EQ, "D");
                        oParameters.filters.push(oFilterTwo);
                        //const request = await this.deleteEntity(facturaModel, `/Facturas('${solicitudBorrar.codigoSolicitud}')`);
                        const request = await this.readEntity(ODATA_SAP, "/facturaSet", oParameters);
                        MessageBox[request.results[0].e_subrc](request.results[0].e_msg);
                        viewModel.setProperty("/tableBusy", true);
                        this._setListaSolicitudes({ filters: [] });
                    }
                }.bind(this)
            });
        },

        onMostrarVistaRapida: async function (event) {
            const btnVistaRapida = event.getSource();
            // const solicitud = btnVistaRapida.getBindingContext().getObject();
            const path = btnVistaRapida.getBindingContext().getPath();
            // MODEL.setProperty("/EstadoFactura",solicitud.estadoFactura);            
            let vistaRapida = that._dialogs["VistaRapida"];
            if (!vistaRapida) {
                vistaRapida = await that._getDialogs("VistaRapida");
            }
            vistaRapida.unbindElement();
            vistaRapida.close();
            vistaRapida.bindElement(path);
            vistaRapida.openBy(btnVistaRapida);
        },

        onMostrarSeleccionProveedor: async function () {

            // Crear una referencia al fragmento
            let SeleccionProveedor = that._dialogs["SeleccionarProveedor"];
            if (!SeleccionProveedor) {
                SeleccionProveedor = await that._getDialogs("SeleccionarProveedor");
                SeleccionProveedor.setEscapeHandler(function () { });
                SeleccionProveedor.open();
            }
        },


        onSeleccionarProveedor: async function () {
            let SeleccionProveedor = that._dialogs["SeleccionarProveedor"];
            SeleccionProveedor.close();
        },

        onSolicitarPagoFactura: async function () {
            const tableFacturas = this.getView().byId("idFacturasTable");
            const selectedFacturas = tableFacturas.getSelectedContextPaths();
            if (selectedFacturas.length === 0) {
                MessageBox.error("Seleccione por lo menos una factura");
                return;
            }
            if (!this._validarSolicitudPago(selectedFacturas)) {
                MessageBox.error("Seleccione solo facturas con estado Registrado");
                return;
            }
            MODEL.setProperty("/tituloMensaje", "¿Desea solicitar pago de facturas?");
            selectedFacturas.map(path => {
                messageManager.addMessages(new Message({
                    message: MODEL.getProperty(path).XBLNR,
                    additionalText: "",
                    description: MODEL.getProperty(path).CODEFACT,
                    type: "Warning",
                    target: "/Dummy",
                    processor: MODEL
                }));
            });
            const mensajeConfirmacion = await this._mostrarMensajes("MensajeConfirmacion");
            mensajeConfirmacion.open();
        },

        onAceptarMensajeConfirmacion: async function () {
            this.onCerrarMensajeConfirmacion();
            MODEL.setProperty("/tituloDialog", "Correcto");
            MODEL.setProperty("/stateDialog", "Success");
            MODEL.setProperty("/iconDialog", "sap-icon://message-success");
            MODEL.setProperty("/tituloMensaje", "Las Solicicitudes fueron enviadas");
            const tableFacturas = this.getView().byId("idFacturasTable");
            const selectedFacturas = tableFacturas.getSelectedContexts();
            if (selectedFacturas.length > 0) {
                viewModel.setProperty("/tableBusy", true);
                const solicitudes = await this._actualizarSolicitudes(selectedFacturas);
                console.log(solicitudes);
                selectedFacturas.map(solicitud => {
                    messageManager.addMessages(new Message({
                        message: solicitud.getObject().XBLNR,
                        additionalText: "",
                        description: solicitud.getObject().CODEFACT,
                        type: "Success",
                        target: "/Dummy",
                        processor: MODEL
                    }));
                });
                const mensajeInformativo = await this._mostrarMensajes("MensajeInformativo");
                mensajeInformativo.open();
                // viewModel.setProperty("/tableBusy", false);
                this._setListaSolicitudes({ filters: [] });
            }
        },

        onCerrarMensajeConfirmacion: function () {
            const dialog = that._dialogs["MensajeConfirmacion"];
            dialog.close();
            messageManager.removeAllMessages();
        },

        onCerrarMensajeInformativo: function () {
            const dialog = that._dialogs["MensajeInformativo"];
            dialog.close();
            // messageManager.removeAllMessages();
        },

        onAfterCloseMensajeConfirmacion: function () {
            // MODEL.setProperty("/tituloDialog", "");
            // MODEL.setProperty("/stateDialog", "");
            // MODEL.setProperty("/iconDialog", "");
            // MODEL.setProperty("/tituloMensaje", "");
            // messageManager.removeAllMessages();
        },

        onAfterCloseMensajeInformativo: function () {
            MODEL.setProperty("/tituloDialog", "");
            MODEL.setProperty("/stateDialog", "");
            MODEL.setProperty("/iconDialog", "");
            MODEL.setProperty("/tituloMensaje", "");
            messageManager.removeAllMessages();
            this._limpiarItemsSeleccionados();
        },

        // onAprobarFacturas: function () {
        //     
        // },

        // onRechazarFacturas: function () {
        //     const tableFacturas = this.getView().byId("idFacturasTable");
        //     const selectedFacturas = tableFacturas.getSelectedContextPaths();
        //     if(selectedFacturas.length > 0 ){
        //         return;
        //     }

        //     MessageBox.error("Seleccione por lo menos una factura");
        // },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */


        _onSolicitudesMatched: function (event) {
            let table = that.getTable();
            let idTable = table.getId();
            if (idTable == "idFacturasTable") {
                table.removeSelections();
            }
            //that.byId("idFacturasTable").removeSelections();
            const historyDirection = History.getInstance().getDirection();
            if (historyDirection === "NewEntry") {
                viewModel.setProperty("/tableBusy", true);
                //this._setListaSolicitudes({ filters: [] });
                return;
            }
        },

        /**
         * Internal helper method to apply both filter and search state together on the list binding
         * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
         * @private
         */
        _applySearch: function (aTableSearchState) {
            var oTable = this.byId("idFacturasTable");
            oTable.getBinding("items").filter(aTableSearchState, "Application");
            // changes the noDataText of the list in case there are no filter results
            if (aTableSearchState.length !== 0) {
                viewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("solicitudesNoDataWithSearchText"));
            }
        },

        _limpiarItemsSeleccionados: function () {
            const tableFacturas = this.getView().byId("idFacturasTable");
            const selectedItems = tableFacturas.getSelectedItems();
            selectedItems.forEach(element => {
                tableFacturas.setSelectedItem(element, false);
            });
        },

        _validarSolicitudPago: function (facturasSeleccionadas) {
            let esValido = true;
            facturasSeleccionadas.forEach(path => {
                if (MODEL.getProperty(path).BESTU !== "CR") {
                    esValido = false;
                }
            });

            return esValido;
        },

        _getDialogs: async function (dialogName) {
            let dialog = that._dialogs[dialogName];
            if (!dialog) {
                dialog = await this.loadFragment({
                    name: `usil.com.createinvoice.solicitudes.${dialogName}`
                });
                that._dialogs[dialogName] = dialog
            }
            return dialog;
        },

        _mostrarMensajes: async function (dialogName) {
            let dialog = that._dialogs[dialogName];
            if (!dialog) {
                dialog = await this.loadFragment({
                    name: `usil.com.createinvoice.view.fragments.${dialogName}`
                });
                that._dialogs[dialogName] = dialog
            }
            return dialog;
        },

        _getDataInitial: async function () {
            //     const facturaModel = this.getOwnerComponent().getModel("facturaModel");
            //     const requests = await Promise.all([
            //         this.readEntity(facturaModel, "/Facturas", )
            // this.readEntity(facturaModel, "/EstadosFactura", [])
            // ]);
            // const [ facturas /*, estadosFactura*/ ] = requests; 
            // viewModel.setProperty("/EstadosFactura",estadosFactura.results);
            // MODEL.setProperty("/Facturas", facturas.results);
        },

        _setListaSolicitudes: async function (parameters) {
            // parameters.urlParameters = {
            //     "$expand":"estadoFactura,conformidades"
            // };
            // const request = await this.readEntity(facturaModel,"/Facturas",parameters);
            //var aFilters = [];
            var oFilter = new Filter("i_userscp", FilterOperator.EQ, "P2002198484");
            parameters.filters.push(oFilter);
            //aFilters.push(oFilter);
            var sociedad = new Filter("ir_bukrs", FilterOperator.EQ, "CDBS,PE02,3000,1000");
            parameters.filters.push(sociedad);
            //aFilters.push(sociedad);
            //parameters.filters = aFilters;
            parameters.urlParameters = {};
            const request = await this.readEntity(ODATA_SAP, "/listarFacturaSet", parameters);
            let sJson = request.results[0].et_data;
            sJson = sJson.replace(/00000000/g, '"00000000"');
            let aLista = JSON.parse(sJson);
            $.each(aLista, (idx, value) => {
                value.CODEFACT = value.CODEFACT.toString();
            });
            MODEL.setProperty("/Facturas", aLista);
            viewModel.setProperty("/tableBusy", false);
        },

        _actualizarSolicitudes: async function (solicitudes) {
            let solicitud;
            const requests = solicitudes.map(item => {
                solicitud = item.getObject();
                let oAction = new Filter("i_action", FilterOperator.EQ, "EN"),
                    oFactura = new Filter("it_fact_prov_c", FilterOperator.EQ, solicitud.CODEFACT),
                    oUserScp = new Filter("i_userscp", FilterOperator.EQ, "JALZA");
                let aFilters = [oAction, oFactura, oUserScp];
                let oParameters = {
                    filters: aFilters,
                    urlParameters: {}
                };
                return this.readEntity(ODATA_SAP, "/statusSet", oParameters);

                // return this.updateEntity(facturaModel,`/Facturas('${solicitud.codigoSolicitud}')`,{
                //     "estadoFactura": {
                //         "ID": 2
                //     },
                //     "estadoContabilizacion": {
                //         "ID": 1
                //     }
                // });
            });
            return await Promise.all(requests);
        },
        getEstadosFactura: function () {
            return [
                { ID: "CR", description: "Creada", icon: "sap-icon://create" },
                { ID: "EN", description: "Enviada", icon: "sap-icon://paper-plane" },
                { ID: "PR", description: "Procesada", icon: "sap-icon://in-progress" },
                { ID: "PA", description: "Pagada", icon: "sap-icon://paid-leave" },
                { ID: "OB", description: "Observada", icon: "sap-icon://decline" }
            ]
        },
        onFileSelectTxt: function (oEvent) {
            var oFile = oEvent.getParameter("files")[0];
            console.log("Archivo seleccionado:", oFile);
            that.onReadTxt(oFile);
        },
        onReadTxt: function (oFile) {
            if (oFile) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var contenido = e.target.result;
                    that.MostrarTablaPorFlujo("Solicitudes");
                    console.log('Contenido del archivo:', contenido);
                };
                reader.readAsText(oFile);
            }
        },
        onFileSelectExcel: function (oEvent) {
            var oFile = oEvent.getParameter("files")[0];
            console.log("Archivo seleccionado:", oFile);
            that.onReadExcel(oFile);
        },
        onReadExcel: function (oFile) {
            if (window.FileReader) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var sXmlResult = e.target.result;
                    var sXmlRead = XLSX.read(sXmlResult, {
                        type: 'binary'
                    });
                    sXmlRead.SheetNames.forEach(function (sheetName) {
                        var aXmlData = XLSX.utils.sheet_to_row_object_array(sXmlRead.Sheets[sheetName]);
                        if (aXmlData[0] != "ERROR") {
                            if (aXmlData.length > 0) {
                                aXmlData.splice(0, 1);
                                var DataValida = aXmlData;
                                MODEL.setProperty("/CargaExcel", DataValida);
                                that.MostrarTablaPorFlujo("Excel");
                            } else {
                                that.MessageBox.error("El archivo excel no cuenta con datos");
                                oView.byId("button-message").setVisible(true);
                                sap.ui.core.BusyIndicator.hide(0);
                            }
                        } else {
                            MessageBox.error("Formato excel incorrecto, por favor descargue la plantilla.");
                            sap.ui.core.BusyIndicator.hide(0);
                            that.onLimpiarTable();
                        }
                    });
                }
                reader.readAsBinaryString(oFile);
            } else {
                that.MessageBox.error("Navegador no soporta las librerias necesarias para extraer la data del archivo csv");
                oView.byId("button-message").setVisible(true);
                sap.ui.core.BusyIndicator.hide(0);
            }
        },
        CreateColumnListItem: function (TypeTable) {
            var oColumnListItem
            // Crear elementos de la tabla
            switch (TypeTable) {
                case "Solicitudes":
                    oColumnListItem = new sap.m.ColumnListItem({
                        type: "Navigation",
                        press: this.onDetalleSolicitud,
                        highlight: {
                            path: 'BESTU',
                            formatter: '.formatter.formatEstados'
                        }
                    });
                    break;
                case "Excel":
                    oColumnListItem = new sap.m.ColumnListItem({
                        type: "Inactive",
                        //press: this.onDetalleSolicitud,
                        /*highlight: {
                            path: 'BESTU',
                            formatter: '.formatter.formatEstados'
                        }*/
                    });
                    break;
            }
            return oColumnListItem;
        },
        AddCellToColumnListItem: function (aColumns, oColumnListItem, TypeTable) {
            switch (TypeTable) {
                case "Solicitudes":
                    // Agregar celdas a los elementos de la tabla
                    aColumns.forEach(function (oColumnData) {
                        var oCell;
                        if (!oColumnData.path.includes("btn")) {
                            oCell = new sap.m.Text({ text: "{" + oColumnData.path + "}" });
                        } else {

                            var oButtonDelete = new sap.m.Button({
                                icon: "{i18n>iconDelete}",
                                press: that.onBorrarSolicitud,
                                type: "Reject",
                                tooltip: "{i18n>borrarTooltip}",
                                visible: "{= ${BESTU} === 'CR' ? true : false }"
                            });


                            var oButtonDetailView = new sap.m.Button({
                                icon: "{i18n>iconDetailView}",
                                press: that.onMostrarVistaRapida,
                                type: "Transparent",
                                ariaHasPopup: "Dialog",
                                tooltip: "{i18n>vistaRapidaTooltip}"
                            });
                            oCell = (oColumnData.path == "btnverDetalle") ? oButtonDetailView : oButtonDelete;
                            //oCell = new sap.m.Text({ text: "" });
                        }
                        oColumnListItem.addCell(oCell);
                    });
                    break;
                case "Excel":
                    // Agregar celdas a los elementos de la tabla
                    aColumns.forEach(function (oColumnData) {
                        var oCell;
                        if (oColumnData.path) {
                            oCell = new sap.m.Text({ text: "{" + oColumnData.path + "}" });
                        } else {
                            oCell = new sap.m.Text({ text: "" });
                        }
                        oColumnListItem.addCell(oCell);
                    });
                    break;
            }
        },
        ColumnsForDynamicTable: function (oTable, TypeTable) {
            var aColumns;
            switch (TypeTable) {
                case "Solicitudes":
                    // Crear las columnas
                    aColumns = [
                        { id: "CODEFACT", label: "Solicitud", path: "CODEFACT", width: "10rem" },
                        { id: "XBLNR", label: "Factura", path: "XBLNR", demandPopin: true, minScreenWidth: "Tablet" },
                        { id: "DATFA", label: "Fecha de Emisión", path: "DATFA", demandPopin: true, minScreenWidth: "Tablet" },
                        { id: "NETWR", label: "Importe", path: "NETWR", demandPopin: true, minScreenWidth: "Tablet" },
                        { id: "BESTU", label: "Estado de Factura", path: "BESTU", demandPopin: true, minScreenWidth: "Tablet" },
                        { width: "5rem", path: "btnverDetalle" },
                        { width: "5rem", path: "btnEliminarSolicitud" }
                    ];

                    // Agregar las columnas a la tabla
                    aColumns.forEach(function (oColumnData) {
                        var oColumn = new sap.m.Column({
                            width: oColumnData.width || "auto",
                            header: new sap.m.Text({ text: oColumnData.label }),
                            id: oColumnData.id
                        });
                        // Agregar columnas al modelo
                        oTable.addColumn(oColumn);
                    });
                    break;
                case "Excel":
                    // Crear las columnas
                    aColumns = [
                        { id: "NumFactura", label: "N° De Fact", path: "NumFactura", width: "9rem" },
                        { id: "Caja", label: "Caja", path: "Caja", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "NumOrden", label: "N° De Orden", path: "NumOrden", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "NumParte", label: "N° De Parte", path: "NumParte", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "Item", label: "Item", path: "Item", demandPopin: true, minScreenWidth: "Tablet", width: "5rem" },
                        { id: "Descripcion", label: "Descripción", path: "Descripcion", demandPopin: true, minScreenWidth: "Tablet", width: "10rem" },
                        { id: "Origen", label: "Origen", path: "Origen", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "Peso", label: "Peso", path: "Peso", demandPopin: true, minScreenWidth: "Tablet", width: "5rem" },
                        { id: "Fob", label: "FOB", path: "Fob", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "Cant", label: "CANT", path: "Cant", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "Total", label: "TOTAL", path: "Total", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },

                    ];

                    // Agregar las columnas a la tabla
                    aColumns.forEach(function (oColumnData) {
                        var oColumn = new sap.m.Column({
                            width: oColumnData.width || "auto",
                            header: new sap.m.Text({ text: oColumnData.label }),
                            id: oColumnData.id
                        });
                        // Agregar columnas al modelo
                        oTable.addColumn(oColumn);
                    });
                    break;
            }

            return aColumns;
        },
        CreateDynamicHeaderToolbar: function (TypeTable) {
            var oHeaderToolbar;
            switch (TypeTable) {
                case "Solicitudes":
                    // Crear la toolbar de encabezado
                    oHeaderToolbar = new sap.m.OverflowToolbar();

                    // Agregar el título
                    var oTitle = new sap.m.Title({
                        id: "tableHeader",
                        text: "{solicitudesView>/solicitudesTableTitle}",
                        level: "H3"
                    });
                    oHeaderToolbar.addContent(oTitle);

                    // Agregar espacio en blanco
                    oHeaderToolbar.addContent(new sap.m.ToolbarSpacer());

                    // Agregar FileUploader para cargar archivos TXT
                    /*  var oFileUploaderTXT = new sap.ui.unified.FileUploader({
                          id: "fileUploaderTXT",
                          name: "uploadFile",
                          fileType: "txt",
                          icon: "sap-icon://document-text",
                          buttonText: "Cargar txt",
                          change: this.onFileSelectTxt,
                          iconOnly: false,
                          buttonOnly: true
                      });
                      oHeaderToolbar.addContent(oFileUploaderTXT); */

                    // Agregar FileUploader para cargar archivos Excel
                    var oFileUploaderExcel = new sap.ui.unified.FileUploader({
                        id: "onFileSelectExcel",
                        name: "uploadFile",
                        fileType: "xls,xlsx",
                        icon: "sap-icon://excel-attachment",
                        buttonText: "Cargar excel",
                        change: this.onFileSelectExcel,
                        iconOnly: false,
                        buttonOnly: true
                    });
                    oHeaderToolbar.addContent(oFileUploaderExcel);

                    // Crear el botón con icono
                    var oButtonDescargarExcel = new sap.m.Button({
                        text: "",
                        icon: "sap-icon://download",
                        press: this.ExportExcel.bind(this, TypeTable)
                    });

                    oHeaderToolbar.addContent(oButtonDescargarExcel);

                    // Agregar campo de búsqueda
                    var oSearchField = new sap.m.SearchField({
                        id: "idBusquedaRapida",
                        tooltip: "{i18n>solicitudesSearchTooltip}",
                        liveChange: this.onBusquedaRapida,
                        showSearchButton: false,
                        layoutData: new sap.m.OverflowToolbarLayoutData({
                            maxWidth: "200px",
                            priority: "NeverOverflow"
                        })
                    });
                    oHeaderToolbar.addContent(oSearchField);

                    break;

                case "Excel":
                    // Crear la toolbar de encabezado
                    oHeaderToolbar = new sap.m.OverflowToolbar();

                    // Agregar el título
                    var oTitle = new sap.m.Title({
                        id: "tableHeader",
                        text: "{ExcelView>/solicitudesTableTitle}",
                        level: "H3"
                    });
                    oHeaderToolbar.addContent(oTitle);

                    // Agregar espacio en blanco
                    oHeaderToolbar.addContent(new sap.m.ToolbarSpacer());

                    // Agregar campo de búsqueda
                    var oSearchField = new sap.m.SearchField({
                        id: "idBusquedaRapida",
                        tooltip: "{i18n>solicitudesSearchTooltip}",
                        liveChange: this.onBusquedaRapida,
                        showSearchButton: false,
                        layoutData: new sap.m.OverflowToolbarLayoutData({
                            maxWidth: "200px",
                            priority: "NeverOverflow"
                        })
                    });
                    oHeaderToolbar.addContent(oSearchField);

                    // Agregar FileUploader para cargar archivos TXT
                    var oFileUploaderTXT = new sap.ui.unified.FileUploader({
                        id: "fileUploaderTXT",
                        name: "uploadFile",
                        fileType: "txt",
                        icon: "sap-icon://document-text",
                        buttonText: "Cargar txt",
                        change: this.onFileSelectTxt,
                        iconOnly: false,
                        buttonOnly: true
                    });
                    oHeaderToolbar.addContent(oFileUploaderTXT);

                    // Agregar FileUploader para cargar archivos Excel
                    var oFileUploaderExcel = new sap.ui.unified.FileUploader({
                        id: "onFileSelectExcel",
                        name: "uploadFile",
                        fileType: "xls,xlsx",
                        icon: "sap-icon://excel-attachment",
                        buttonText: "Cargar excel",
                        change: this.onFileSelectExcel,
                        iconOnly: false,
                        buttonOnly: true
                    });
                    oHeaderToolbar.addContent(oFileUploaderExcel);

                    // Crear el botón con icono
                    var oButtonDescargarExcel = new sap.m.Button({
                        text: "Descargar Excel",
                        icon: "sap-icon://download",
                        press: this.ExportExcel.bind(this, TypeTable)
                    });

                    oHeaderToolbar.addContent(oButtonDescargarExcel);
                    break;
            }
            return oHeaderToolbar;
        },
        GenerateTable: function (oColumnListItem, TypeTable) {
            var oTable;
            switch (TypeTable) {
                // Crear la tabla
                case "Solicitudes":
                    oTable = new sap.m.Table({
                        id: "idFacturasTable",
                        width: "auto",
                        items: {
                            path: "/Facturas",
                            sorter: {
                                path: "codigoSolicitud",
                                descending: true,
                            },
                            template: oColumnListItem
                        },
                        noDataText: "{solicitudesView>/tableNoDataText}",
                        busyIndicatorDelay: 0,
                        busy: "{solicitudesView>tableBusy}",
                        growing: true,
                        growingScrollToLoad: true,
                        updateFinished: this.onUpdateFinished,
                        mode: "MultiSelect"
                    });
                    break;

                case "Excel":
                    oTable = new sap.m.Table({
                        id: "idCargaExcelTable",
                        width: "auto",
                        items: {
                            path: "/CargaExcel",
                            sorter: {
                                path: "codigoSolicitud",
                                descending: true,
                            },
                            template: oColumnListItem
                        },
                        noDataText: "{ExcelView>/tableNoDataText}",
                        busyIndicatorDelay: 0,
                        busy: "{ExcelView>tableBusy}",
                        growing: true,
                        growingScrollToLoad: true,
                        //updateFinished: this.onUpdateFinished,
                        mode: "MultiSelect"
                    });
                    break;
            }
            return oTable;

        },
        bindItemsToTable: function (oTable, oColumnListItem, TypeTable) {
            switch (TypeTable) {
                case "Solicitudes":
                    oTable.bindItems("/Facturas", oColumnListItem);
                    break;
                case "Excel":
                    oTable.bindItems("/CargaExcel", oColumnListItem);
                    break;
            }
        },
        createDynamicTable: function (TypeTable) {

            let oColumnListItem = that.CreateColumnListItem(TypeTable);

            let oTable = that.GenerateTable(oColumnListItem, TypeTable);

            let oHeaderToolbar = that.CreateDynamicHeaderToolbar(TypeTable);

            // agregamos el toolbar de encabezado en la tabla
            oTable.setHeaderToolbar(oHeaderToolbar);

            //Agregamos las columnas a la tabla
            let aColumns = that.ColumnsForDynamicTable(oTable, TypeTable);

            // Agregar celdas a los elementos de la tabla
            that.AddCellToColumnListItem(aColumns, oColumnListItem, TypeTable);

            // Agregar elementos a la tabla
            that.bindItemsToTable(oTable, oColumnListItem, TypeTable);

            // Devolver la tabla creada
            return oTable;

        },
        AddcontentToView: function (oTable) {
            let object = {
                "CODEFACT": "121212", "XBLNR": "F343434", "DATFA": "15.11.2023",
                "NETWR": "1000", "BESTU": "Success", "IGV": 1.18
            }
            MODEL.setProperty("/Facturas", [object]);
            var oView = this.getView();
            oView.addDependent(oTable);
            oView.byId("ContenedorTabla").addContent(oTable);
        },
        MostrarTablaPorFlujo: function (TypeTable) {
            var oView = this.getView();
            var contenedor = oView.byId("ContenedorTabla");
            contenedor.destroyContent();
            let table = that.createDynamicTable(TypeTable);
            that.AddcontentToView(table);
        },
        ExportExcel: function (TypeTable) {
            let oView = this.getView();
            switch (TypeTable) {
                case "Solicitudes":
                    var table = oView.byId("ContenedorTabla").getContent()[0];
                    var aData = MODEL.getProperty("/Facturas");
                    var columns = [];
                    if (aData.length > 0) {
                        columns = that.getColumnas(TypeTable, table);
                        that.DownLoadExcel(aData, columns, "Reporte Solicitudes");
                    }
                    else {
                        MessageBox.information(
                            "No se obtuvo información para exportar",
                            {
                                title: "Descargar Excel: Sin datos para exportar",
                                actions: [MessageBox.Action.OK]
                            }
                        );
                    }
                    break;

                case "Excel":
                    var table = oView.byId("ContenedorTabla").getContent()[0];
                    var aData = MODEL.getProperty("/CargaExcel");
                    var columns = [];
                    if (aData.length > 0) {
                        columns = that.getColumnas(TypeTable, table);
                        that.DownLoadExcel(aData, columns, "Reporte - Excel carga masiva");
                    }
                    else {
                        MessageBox.information(
                            "No se obtuvo información para exportar",
                            {
                                title: "Descargar Excel: Sin datos para exportar",
                                actions: [MessageBox.Action.OK]
                            }
                        );
                    }
                    break;
            }
        },
        DownLoadExcel: function (Data, Columns, name) {
            var mSettings = {
                workbook: {
                    columns: Columns,
                },
                dataSource: Data,
                fileName: name + ".xlsx"
            };
            var oSpreadsheet = new Spreadsheet(mSettings);
            oSpreadsheet.build();
        },
        getColumnas(TypeTable, Table) {
            var columnas = [];
            switch (TypeTable) {
                case "Solicitudes":
                    var Columns = Table.getColumns();
                    $.each(Columns, function (i, item) {
                        if (!(item.getId()).includes("_")) {
                            columnas.push({
                                "label": item.getHeader().getText(),
                                "property": item.getId(),
                                "type": "string"
                            })
                        }
                    });
                    break;

                case "Excel":
                    var Columns = Table.getColumns();
                    $.each(Columns, function (i, item) {
                        if (!(item.getId()).includes("_")) {
                            columnas.push({
                                "label": item.getHeader().getText(),
                                "property": item.getId(),
                                "type": "string"
                            })
                        }
                    });
                    break;

            }

            return columnas;
        },
        getTable: function () {
            var table = that.byId("ContenedorTabla").getContent()[0];
            return table;
        },
        onSuggest: async function (event) {
            var sValue = event.getParameter("suggestValue"),
                aFilters = [];
            sValue = sValue.toUpperCase();
            await this.getProveedoresHelp(sValue);
            if (sValue) {
                aFilters = [
                    new Filter([
                        new Filter("VALUE", function (sText) {
                            return (sText || "").toUpperCase().indexOf(sValue.toUpperCase()) > -1;
                        }),
                        new Filter("TEXTO", function (sDes) {
                            return (sDes || "").toUpperCase().indexOf(sValue.toUpperCase()) > -1;
                        })
                    ], false)
                ];
            }

            this.byId("fltReceta").getBinding("suggestionItems").filter(aFilters);
            this.byId("fltReceta").suggest();
        },
        getProveedoresHelp: function (sValue = "") {
            return new Promise((resolve, reject) => {
                ODataUtilidadesModel.read("/filtrosSet", {
                    filters: [
                        new Filter("i_value", FilterOperator.EQ, sValue),
                        new Filter("i_object", FilterOperator.EQ, "LIFNR"),
                        //new Filter("i_filter", FilterOperator.EQ, keyCentro)
                    ],
                    success: function (oData) {
                        if (oData.results.length) {
                            let aProveedores = JSON.parse(oData.results[0].et_data);
                            for (let i = 0; i < aProveedores.length; i++) {
                                aProveedores[i].VALUE = parseInt(aProveedores[i].VALUE).toString();
                            }
                            that.getView().setModel(new JSONModel(aProveedores), "proveedoreshelp");
                        }
                        resolve(true);
                    },
                    error: function (oError) {
                        MessageBox.error(oError.responseText);
                        resolve(true);
                    }
                });
            });
        },
    });
});
