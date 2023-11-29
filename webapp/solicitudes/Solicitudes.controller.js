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
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast"
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
    Spreadsheet,
    MessageToast
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

    return BaseController.extend("usil.com.createinvoice.atc.solicitudes.Solicitudes", {

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
            facturaModel = this.getOwnerComponent().getModel("facturaModel");
            ODATA_SAP = this.getOwnerComponent().getModel("ODATA_SAP");
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


            ODataUtilidadesModel = this.getOwnerComponent().getModel("ODataUtilidadesModel");
            messageManager = sap.ui.getCore().getMessageManager();

            this.setModel(viewModel, "solicitudesView");
            this.setModel(viewModelExcel, "ExcelView");
            this.setModel(messageManager.getMessageModel(), "message");
            this.getEstadosFactura();


            MODEL.setProperty("/Ordenes", Service.getInstance().newOrdenCompra());
            // MODEL.setProperty("/Tipo",Service.getInstance().newTipo());
            // MODEL.setProperty("/EstadosFactura",Service.getInstance().newEstadofactura());
            MODEL.setProperty("/Busqueda", {});
            that._dialogs = {};
            that.onMostrarSeleccionProveedor();
            // this._getDataInitial();
            //this._setListaSolicitudes({ filters: [] });

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
                sTitle = that.getResourceBundle().getText("solicitudesTableTitleCount", [iTotalItems]);
            } else {
                sTitle = that.getResourceBundle().getText("solicitudesTableTitle");
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
            const codigoSolicitud = contexto.getProperty("SOLFAC");//codigoSolicitud
            let array = [];
            let page = "detalle";
            if (solicitud.estadoFactura_ID === 1) {
                page = "factura";
            }

            that.getOwnerComponent().setModel(new JSONModel(solicitud), "oCabecera");
            that.getRouter().navTo(page, {
                codigoSolicitud: codigoSolicitud,
                proveedor: that.getView().byId("ProveedorSeleccionado").getText().trim(),
                posiciones: JSON.stringify(array)
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
        onSeleccionFechaContabilizacion: function (event) {
            const fechaInicio = event.getSource().getDateValue();
            const fechaFinal = event.getSource().getSecondDateValue();
            MODEL.setProperty("/Busqueda/fechaContabilizacion", {
                fechaInicio: formatter.formatDateParameter(fechaInicio),
                fechaFinal: formatter.formatDateParameter(fechaFinal)
            });
        },
        onBuscarFacturas: function () {
            const busqueda = MODEL.getProperty("/Busqueda");
            const filters = [];
            const dFechaEmision = that.byId("idDateRangeEmision"),
                dFechaRegistro = that.byId("idDateRangeRegistro"),
                dFechaContabilizacion = that.byId("idDateRangeContabilizacion"),
                InputCodigoFactura = that.byId("InputCodigoFactura").getValue(),
                InputCodigoSolicitud = that.byId("InputCodigoSolicitud").getValue(),
                ComboEstados = that.byId("ComboEstados").getSelectedKeys().join(","),
                Proveedor = sap.ui.getCore().getModel("Lifnr").getData().Lifnr;

            if (dFechaEmision.getValue() !== "") {
                let sFechaIni = dFechaEmision.getDateValue();
                let sFechaFin = dFechaEmision.getSecondDateValue();

                if ((sFechaIni != null && sFechaIni != undefined) && (sFechaFin != null && sFechaFin != undefined)) {
                    filters.push(
                        new Filter("IR_FEMISI", "BT", formatter.formatDateToString(sFechaIni), formatter.formatDateToString(sFechaFin)) // fechaEmision
                    );
                }
            }

            if (dFechaContabilizacion.getValue() !== "") {
                let sFechaIni = dFechaContabilizacion.getDateValue();
                let sFechaFin = dFechaContabilizacion.getSecondDateValue();

                if ((sFechaIni != null && sFechaIni != undefined) && (sFechaFin != null && sFechaFin != undefined)) {
                    filters.push(
                        new Filter("IR_FKDAT", "BT", formatter.formatDateToString(sFechaIni), formatter.formatDateToString(sFechaFin)) // fechaEmision
                    );
                }
            }

            //Fecha Creación de solicitud
            if (dFechaRegistro.getValue() !== "") {
                let sFechaIni = dFechaRegistro.getDateValue();
                let sFechaFin = dFechaRegistro.getSecondDateValue();

                if ((sFechaIni != null && sFechaIni != undefined) && (sFechaFin != null && sFechaFin != undefined)) {
                    filters.push(
                        new Filter("IR_FCRESO", "BT", formatter.formatDateToString(sFechaIni), formatter.formatDateToString(sFechaFin)) //fechaRegistro
                    );
                }
            }

            if (Proveedor) filters.push(new Filter("I_LIFNR", "EQ", Proveedor));

            if (InputCodigoSolicitud) filters.push(new Filter("I_SOLFAC", "EQ", InputCodigoSolicitud)); //codigoSolicitud
            if (InputCodigoFactura) filters.push(new Filter("I_FACTUR", "EQ", InputCodigoFactura)); // codigoFactura
            // if(busqueda.fechaEmision) {
            //     filters.push(
            //         new Filter("ir_bedat","BT", busqueda.fechaEmision.fechaInicio , busqueda.fechaEmision.fechaFinal) // fechaEmision
            //     );
            // } 

            if (ComboEstados) filters.push(new Filter("I_ESTADO", "EQ", ComboEstados)); // estadoFactura_ID
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
            var oMultiComboBox = this.getView().byId("ComboEstados");
            const dateRangeEmision = this.getView().byId("idDateRangeEmision");
            const dateRangeRegistro = this.getView().byId("idDateRangeRegistro");
            const DateRangeContabilizacion = this.getView().byId("idDateRangeContabilizacion");
            // limpiamos fechas
            oMultiComboBox.setSelectedKeys([]);
            dateRangeEmision.setDateValue(null);
            dateRangeEmision.setSecondDateValue(null);
            DateRangeContabilizacion.setDateValue(null);
            DateRangeContabilizacion.setSecondDateValue(null);
            dateRangeRegistro.setDateValue(null);
            dateRangeRegistro.setSecondDateValue(null);
            viewModel.setProperty("/tableBusy", true);
            this._setListaSolicitudes({ filters: [] });
            this._limpiarItemsSeleccionados();

        },

        onObtenerFiltrosSearch: function (TypeTable, query) {
            let aTableSearchState = [];
            switch (TypeTable) {
                case "Solicitudes":
                    aTableSearchState = [
                        new Filter({
                            filters: [
                                new Filter("SOLFAC", FilterOperator.Contains, query),
                                new Filter("FACTUR", FilterOperator.Contains, query)
                            ],
                            and: false
                        })
                    ];
                    break;

                case "Vehiculos":
                    aTableSearchState = [
                        new Filter({
                            filters: [
                                new Filter("NumFactura", FilterOperator.Contains, query),
                                new Filter("NumOrden", FilterOperator.Contains, query),
                                new Filter("NumParte", FilterOperator.Contains, query),
                                new Filter("Item", FilterOperator.Contains, query),
                                new Filter("Descripcion", FilterOperator.Contains, query),
                                new Filter("Origen", FilterOperator.Contains, query),
                            ],
                            and: false
                        })
                    ];
                    break;

                case "Repuestos":
                    aTableSearchState = [
                        new Filter({
                            filters: [
                                new Filter("FACTUR", FilterOperator.Contains, query),
                                new Filter("XBLNR", FilterOperator.Contains, query)
                            ],
                            and: false
                        })
                    ];
                    break;

            }

            return aTableSearchState;

        },
        onBusquedaRapida: function (TypeTable, event) {

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
                    aTableSearchState = that.onObtenerFiltrosSearch(TypeTable, query);
                }
                that._applySearch(aTableSearchState);
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
            MessageBox.confirm(`¿Está seguro de eliminar la solicitud ${solicitud.FACTUR}?`, {
                onClose: async function (action) {
                    if (action === "OK") {
                        // logica temporal
                        // const solicitudes = MODEL.getProperty("/Facturas");
                        const solicitudBorrar = MODEL.getProperty(path);
                        let oParameters = { filters: [] };
                        var oFilterOne = new Filter("is_fact_prov_c", FilterOperator.EQ, solicitudBorrar.FACTUR);
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

        onMostrarVistaRapida: async function (VistaRapida, event) {
            const btnVistaRapida = event.getSource();
            // const solicitud = btnVistaRapida.getBindingContext().getObject();
            const path = btnVistaRapida.getBindingContext().getPath();
            // MODEL.setProperty("/EstadoFactura",solicitud.estadoFactura);            
            let vistaRapida = that._dialogs[VistaRapida];
            if (!vistaRapida) {
                vistaRapida = await that._getDialogs(VistaRapida);
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
            else {
                SeleccionProveedor.setEscapeHandler(function () { });
                SeleccionProveedor.open();
            }
        },

        onMostrarSeleccionEstructuraExcel: async function () {
            // Crear una referencia al fragmento
            let SeleccionEstructura = that._dialogs["SeleccionarEstructuraExcel"];
            if (!SeleccionEstructura) {
                SeleccionEstructura = await that._getDialogs("SeleccionarEstructuraExcel");
                //SeleccionEstructura.setEscapeHandler(function () { });
                SeleccionEstructura.open();
            }
            else {
                SeleccionEstructura.open();
            }
        },

        onSeleccionarProveedor: async function (oEvent) {
            let proveedoreshelp = that.getView().getModel("proveedoreshelp").getData();
            let proveedorSelected = that.getView().byId("InputSelectProveedor").getValue();

            var find = proveedoreshelp.find(element => element.VALUE == proveedorSelected.trim() || element.TEXTO == proveedorSelected.trim())
            if (find != undefined) {
                sap.ui.getCore().setModel(new JSONModel({ "Lifnr": find.VALUE }), "Lifnr")
                that.getView().byId("ProveedorSeleccionado").setText("Proveedor: " /*+ find.VALUE + " - "*/ + find.TEXTO + "    ");
                let SeleccionProveedor = that._dialogs["SeleccionarProveedor"];
                that.onBuscarFacturas();
                SeleccionProveedor.close();
            }
            else {
                MessageToast.show("Seleccione un proveedor valido");
            }
        },

        onSolicitarPagoFactura: async function (oEvent) {
            const tableFacturas = that.getTable();
            const selectedFacturas = tableFacturas.getSelectedContextPaths();
            if (selectedFacturas.length === 0) {
                MessageBox.error("Seleccione por lo menos una factura");
                return;
            }
            /* if (!this._validarSolicitudPago(selectedFacturas)) {
                 MessageBox.error("Seleccione solo facturas con estado Registrado");
                 return;
             }*/
            MODEL.setProperty("/tituloMensaje", "¿Desea solicitar pago de facturas?");
            selectedFacturas.map(path => {
                messageManager.addMessages(new Message({
                    message: MODEL.getProperty(path).SOLFAC,
                    additionalText: "",
                    description: MODEL.getProperty(path).FACTUR,
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
            const tableFacturas = that.getTable();
            const selectedFacturas = tableFacturas.getSelectedContexts();
            if (selectedFacturas.length > 0) {
                viewModel.setProperty("/tableBusy", true);
                const solicitudes = await this._actualizarSolicitudes(selectedFacturas);
                console.log(solicitudes);

                selectedFacturas.map(solicitud => {
                    messageManager.addMessages(new Message({
                        message: solicitud.getObject().SOLFAC,
                        additionalText: "",
                        description: solicitud.getObject().FACTUR,
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
            this.onGetUsersIAS();
            let table = that.getTable();
            let idTable = table.getId();
            if (idTable == "idFacturasTable") {
                table.removeSelections();
            }
            //that.byId("idFacturasTable").removeSelections();
            const historyDirection = History.getInstance().getDirection();

            if (historyDirection === "NewEntry") {
                viewModel.setProperty("/tableBusy", true);
                this._setListaSolicitudes({ filters: [] });
                return;
            }
        },
        _getAppModulePath: function (sDestination) {

            let sPathReturn = "";

            const appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            const appPath = appId.replaceAll(".", "/");
            const appPathPortal = jQuery.sap.getModulePath(appPath);
            if (appPathPortal !== ".") {
                sPathReturn = appPathPortal;
            }

            return sPathReturn;

        },
        onGetUsersIAS: async function () {
            let url = that._getAppModulePath() + "/user-api" + "/attributes"//"service/scim/Users"            
            await $.ajax({
                url: url,
                dataType: "json",
                contentType: "application/scim+json; charset=utf-8",
                async: false,
                success: async function (response) {
                    sap.ui.getCore().setModel(new JSONModel({ "USERIAS": response.name }), "USERIAS")
                    //that.onGetFullDataUserInfo(response);
                },
                error: function (xhr) {
                }
            });
        },
        onGetFullDataUserInfo: async function (User) {
            let url = that._getAppModulePath() + "/service/scim/Users/" + User.email
            await $.ajax({
                url: url,
                dataType: "json",
                contentType: "application/scim+json; charset=utf-8",
                async: false,
                success: async function (response) {

                },
                error: function (xhr) {
                }
            });
        },
        /**
         * Internal helper method to apply both filter and search state together on the list binding
         * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
         * @private
         */
        _applySearch: function (aTableSearchState) {
            let oTable = that.getTable();
            oTable.getBinding("items").filter(aTableSearchState, "Application");
            // changes the noDataText of the list in case there are no filter results
            if (aTableSearchState.length !== 0) {
                viewModel.setProperty("/tableNoDataText", that.getResourceBundle().getText("solicitudesNoDataWithSearchText"));
            }
        },

        _limpiarItemsSeleccionados: function () {
            const tableFacturas = that.getTable();
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
                    name: `usil.com.createinvoice.atc.solicitudes.${dialogName}`
                });
                that._dialogs[dialogName] = dialog
            }
            return dialog;
        },

        _mostrarMensajes: async function (dialogName) {
            let dialog = that._dialogs[dialogName];
            if (!dialog) {
                dialog = await this.loadFragment({
                    name: `usil.com.createinvoice.atc.view.fragments.${dialogName}`
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

            parameters.urlParameters = {};

            const request = await this.readEntity(ODATA_SAP, "/obtenerSolFactSet", parameters);

            let sJson = request.results[0].ET_DATA;
            //sJson = sJson.replace(/00000000/g, '"00000000"');
            let aLista = JSON.parse(sJson);
            let EstadosFactura = that.getModel("EstadosFactura").getData();
            $.each(aLista, (idx, value) => {
                let find = EstadosFactura.find(element => element.VALUE == value.ESTADO);
                value.DescripcionEstado = find.TEXTO;
                let resultEstatus = that.getColorStatus(find.TEXTO);
                value.ColorEstado = resultEstatus.state;
                value.IconoEstado = resultEstatus.icon;
                value.IMPORT = formatter.formatCurrency(value.IMPORT);
                value.FKDAT = formatter.formatearFechaString(value.FKDAT);
                value.FCRESO = formatter.formatearFechaString(value.FCRESO);
                value.FEMISI = formatter.formatearFechaString(value.FEMISI);
            });
            console.log(aLista)

            MODEL.setProperty("/Facturas", aLista);
            viewModel.setProperty("/tableBusy", false);
        },

        getColorStatus: function (Estado) {
            let object = { "state": "", "icon": "" };
            switch (Estado) {

                case "Creado":
                    object.state = "Indication05";
                    object.icon = "sap-icon://information";
                    break;

                case "Liberado para pago":
                    object.state = "Information";
                    object.icon = "sap-icon://information";
                    break;

                case "Factura Registrada":
                    object.state = "Indication05";
                    object.icon = "sap-icon://information";
                    break;

                case "Factura Pagada":
                    object.state = "Success";
                    object.icon = "sap-icon://sys-enter-2";
                    break;
                case "Con errores":
                    object.state = "Error";
                    object.icon = "sap-icon://error";
                    break;
                case "Factura Contabilizada":
                    object.state = "Indication08";
                    object.icon = "sap-icon://information";
                    break;

                case "Rechazado":
                    object.state = "Warning";
                    object.icon = "sap-icon://alert";
                    break;
            }
            return object;

        },
        _actualizarSolicitudes: async function (solicitudes) {
            try {
                const requests = solicitudes.map(async item => {
                    try {
                        const copiedObject = (({ ColorEstado, DescripcionEstado, IconoEstado, ...rest }) => rest)(item.getObject());
                        copiedObject.ESTADO = "02";
                        copiedObject.FCRESO = formatter.formatearFechaString(copiedObject.FCRESO);
                        copiedObject.FKDAT = formatter.formatearFechaString(copiedObject.FKDAT);
                        copiedObject.FEMISI = formatter.formatearFechaString(copiedObject.FEMISI);
                        const solicitud = { "IS_FACT_CAB": JSON.stringify(copiedObject) };
                        return await this.createEntity(ODATA_SAP, "/solPagoFactSet", solicitud);
                    } catch (error) {
                        console.error("Error al procesar una solicitud individual:", error);
                        throw error; // Propagar el error para que Promise.all lo maneje
                    }
                });

                return await Promise.all(requests);
            } catch (error) {
                console.error("Error al procesar múltiples solicitudes:", error);
                throw error; // Propagar el error si ocurre al procesar múltiples solicitudes
            }
        },

        getEstadosFactura: async function () {
            let aFilters = [
                new Filter("i_object", FilterOperator.EQ, "ESTADO")
            ]

            let oParameters = {
                filters: aFilters,
                urlParameters: {}
            };
            const request = await this.readEntity(ODataUtilidadesModel, "/filtrosSet", oParameters);
            let data = JSON.parse(request.results[0].et_data);
            that.setModel(new JSONModel(data), "EstadosFactura");

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
            //var oFile = oEvent.getParameter("files")[0];

            that.onProcesarDataExcel();

            //that.onReadExcel(oFile);
        },
        onReadExcel: function (oFile, TypeTable) {
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
                                //aXmlData.splice(0, 1);
                                let result = that.onValidarFormatos((aXmlData[0] == undefined) ? aXmlData[1] : aXmlData[0], TypeTable);

                                if (!result.valid) {
                                    MessageBox.error(
                                        "Estructura de Excel incorrecta para el tipo de carga seleccionado.", {
                                        title: "Formato Incorrecto",
                                        details: result.mensaje,
                                        actions: [sap.m.MessageBox.Action.OK]
                                    }
                                    );
                                    return
                                }
                                let DataValida = that.buildArrayFromDataExcel(aXmlData, TypeTable);
                                switch (TypeTable) {
                                    case "Repuestos":
                                        MODEL.setProperty("/ExcelRepuestos", DataValida);
                                        that.MostrarTablaPorFlujo(TypeTable);
                                        break;
                                    case "Vehiculos":
                                        MODEL.setProperty("/ExcelVehiculos", DataValida);
                                        that.MostrarTablaPorFlujo(TypeTable);
                                        break;
                                }

                                //that.MostrarTablaPorFlujo("Excel");
                                //that.getView().setModel(new JSONModel(aProveedores), "/ExcelRepuestos");
                            } else {
                                that.MessageBox.error("El archivo excel no cuenta con datos");
                                oView.byId("button-message").setVisible(true);
                                sap.ui.core.BusyIndicator.hide(0);
                            }
                        } else {
                            MessageBox.error("Formato excel incorrecto, por favor descargue la plantilla.");
                            sap.ui.core.BusyIndicator.hide(0);
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
                case "Vehiculos":
                    oColumnListItem = new sap.m.ColumnListItem({
                        type: "Inactive",
                        //press: this.onDetalleSolicitud,
                        /*highlight: {
                            path: 'BESTU',
                            formatter: '.formatter.formatEstados'
                        }*/
                    });
                    break;
                case "Repuestos":
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
                            if (oColumnData.path == "DescripcionEstado") {
                                oCell = new sap.m.ObjectStatus({ text: "{" + oColumnData.path + "}", icon: "{" + oColumnData.icon + "}", state: "{" + oColumnData.state + "}", class: "sapUiSmallMarginBottom" });
                            }
                            else if (oColumnData.path == "IMPORT") {
                                oCell = new sap.m.Label({ text: "{" + oColumnData.path + "}", design: oColumnData.design });
                            }
                            else if (oColumnData.path == "SOLFAC") {
                                oCell = new sap.m.Label({ text: "{" + oColumnData.path + "}", design: oColumnData.design });
                            }
                            else {
                                oCell = new sap.m.Text({ text: "{" + oColumnData.path + "}" });
                            }
                        }
                        else {

                            var oButtonDelete = new sap.m.Button({
                                icon: "{i18n>iconDelete}",
                                press: that.onBorrarSolicitud,
                                type: "Reject",
                                tooltip: "{i18n>borrarTooltip}",
                                visible: "{= ${BESTU} === 'CR' ? true : false }"
                            });


                            var oButtonDetailView = new sap.m.Button({
                                icon: "{i18n>iconDetailView}",
                                press: that.onMostrarVistaRapida.bind(that, "VistaRapida"),
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
                case "Vehiculos":
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
                case "Repuestos":
                    // Agregar celdas a los elementos de la tabla
                    aColumns.forEach(function (oColumnData) {
                        var oCell;
                        if (!oColumnData.path.includes("btn")) {
                            oCell = new sap.m.Text({ text: "{" + oColumnData.path + "}" });
                        } else {

                            var oButtonDetailView = new sap.m.Button({
                                icon: "{i18n>iconDetailView}",
                                press: that.onMostrarVistaRapida.bind(that, "VistaRapidaRepuestos"),
                                type: "Transparent",
                                ariaHasPopup: "Dialog",
                                tooltip: "{i18n>vistaRapidaTooltip}"
                            });
                            oCell = oButtonDetailView;
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
                        { id: "SOLFAC", label: "Solicitud", path: "SOLFAC", width: "8rem", design: "Bold" },
                        { id: "FACTUR", label: "Factura", path: "FACTUR", width: "8rem", demandPopin: true, minScreenWidth: "Tablet" },
                        { id: "FEMISI", label: "Fecha de Emisión", path: "FEMISI", demandPopin: true, minScreenWidth: "Tablet" },
                        { id: "FKDAT", label: "Fecha de Contabilización", width: "13rem", path: "FKDAT", demandPopin: true, minScreenWidth: "Tablet" },
                        { id: "IMPORT", label: "Importe", path: "IMPORT", width: "8rem", demandPopin: true, minScreenWidth: "Tablet", design: "Bold" },
                        { id: "ESTADO", label: "Estado de Factura", path: "DescripcionEstado", state: "ColorEstado", icon: "IconoEstado", demandPopin: true, minScreenWidth: "Tablet" },
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
                case "Vehiculos":
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

                case "Repuestos":
                    // Crear las columnas
                    aColumns = [
                        { id: "Sociedad", label: "Sociedad", path: "Sociedad", width: "9rem", visible: true },
                        { id: "Item", label: "Caja", path: "Caja", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: true },
                        { id: "TipoDocumento", label: "Tipo Documento", path: "TipoDocumento", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: true },
                        { id: "ClaseDocumento", label: "Clase Documento", path: "ClaseDocumento", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: true },
                        { id: "NroPedido", label: "Nro Pedido", path: "NroPedido", demandPopin: true, minScreenWidth: "Tablet", width: "5rem", visible: true },
                        { id: "Proveedor", label: "Proveedor", path: "Proveedor", demandPopin: true, minScreenWidth: "Tablet", width: "10rem", visible: true },
                        { id: "OrganizacionCompras", label: "Organizacion Compras", path: "OrganizacionCompras", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: true },
                        { id: "GrupoCompras", label: "Grupo Compras", path: "GrupoCompras", demandPopin: true, minScreenWidth: "Tablet", width: "5rem", visible: true },
                        { id: "Material", label: "Material", path: "Material", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: true },
                        { id: "Cantidad", label: "Cantidad", path: "Cantidad", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: true },
                        { id: "PrecioNeto", label: "Precio Neto", path: "PrecioNeto", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "Solped", label: "Solped", path: "Solped", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "ValorTotal", label: "Valor Total", path: "ValorTotal", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "Caja", label: "Caja", path: "Caja", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "PaisOrigen", label: "Pais Origen", path: "PaisOrigen", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "Centro", label: "Centro", path: "Centro", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "Almacen", label: "Almacen", path: "Almacen", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "Unidad", label: "Unidad", path: "Unidad", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "NumeroBl", label: "Numero Bl", path: "NumeroBl", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "FechaBl", label: "Fecha Bl", path: "FechaBl", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "PuertoSalida", label: "Puerto Salida", path: "PuertoSalida", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "Puertollegada", label: "Puerto Llegada", path: "Puertollegada", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "Icoterms", label: "Icoterms", path: "Icoterms", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "LugarIncoterms", label: "Lugar Incoterms", path: "LugarIncoterms", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { id: "ViaTransporte", label: "Via Transporte", path: "ViaTransporte", demandPopin: true, minScreenWidth: "Tablet", width: "6rem", visible: false },
                        { width: "5rem", path: "btnverDetalle2", visible: true },
                    ];


                    /*aColumns = [
                        { id: "SOCIEDAD", label: "Sociedad", path: "SOCIEDAD", width: "9rem" },
                        { id: "ITEM", label: "Item", path: "ITEM", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "TIPO_DOCUMENTO_COMPRAS", label: "Tipo Documento", path: "TIPO DE DOCUMENTO DE COMPRAS", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "CLASE_DE_DOCUMENTO_DE_COMPRAS", label: "Clase Documento", path: "CLASE DE DOCUMENTO DE COMPRAS", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "No_PEDIDO", label: "Nro Pedido", path: "No PEDIDO", demandPopin: true, minScreenWidth: "Tablet", width: "5rem" },
                        { id: "PROVEEDOR", label: "Proveedor", path: "PROVEEDOR", demandPopin: true, minScreenWidth: "Tablet", width: "10rem" },
                        { id: "ORGANIZACION_DE_COMPRAS", label: "Organizacion Compras", path: "ORGANIZACIÓN DE COMPRAS", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "GRUPO_DE_COMPRAS", label: "Grupo Compras", path: "GRUPO DE COMPRAS", demandPopin: true, minScreenWidth: "Tablet", width: "5rem" },
                        { id: "MATERIAL", label: "Material", path: "MATERIAL", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "CANTIDAD", label: "Cantidad", path: "CANTIDAD", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "PRECIO_NETO", label: "Precio Neto", path: "PRECIO NETO", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "SOLPED", label: "Solped", path: "SOLPED", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "VALOR_TOTAL", label: "Valor Total", path: "VALOR TOTAL", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "CAJA", label: "Caja", path: "CAJA", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "PAIS_DE_ORIGEN", label: "Pais Origen", path: "PAIS DE ORIGEN", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "CENTRO", label: "Centro", path: "CENTRO", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "ALMACEN", label: "Almacen", path: "ALMACEN", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "UNIDAD", label: "Unidad", path: "UNIDAD", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "NUMERO_BL", label: "Numero Bl", path: "NUMERO BL", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "FECHA_BL", label: "Fecha Bl", path: "FECHA BL", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "PUERTO_DE_SALIDA", label: "Puerto Salida", path: "PUERTO DE SALIDA", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "PUERTO_DE_LLEGADA", label: "Puerto Llegada", path: "PUERTO DE LLEGADA", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "ICOTERMS", label: "Icoterms", path: "ICOTERMS", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "LUGAR_INCOTERMS", label: "Lugar Incoterms", path: "LUGAR INCOTERMS", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                        { id: "VIA_TRANSPORTE", label: "Via Transporte", path: "VIA TRANSPORTE", demandPopin: true, minScreenWidth: "Tablet", width: "6rem" },
                    ];*/


                    // Agregar las columnas a la tabla
                    aColumns.forEach(function (oColumnData) {
                        var oColumn = new sap.m.Column({
                            width: oColumnData.width || "auto",
                            header: new sap.m.Text({ text: oColumnData.label }),
                            id: oColumnData.id,
                            visible: oColumnData.visible
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
                    /*  var oFileUploaderExcel = new sap.ui.unified.FileUploader({
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
                      */

                    // Agregar campo de búsqueda
                    var oSearchField = new sap.m.SearchField({
                        id: "idBusquedaRapida",
                        tooltip: "{i18n>solicitudesSearchTooltip}",
                        liveChange: this.onBusquedaRapida.bind(this, TypeTable),
                        showSearchButton: false,
                        layoutData: new sap.m.OverflowToolbarLayoutData({
                            maxWidth: "200px",
                            priority: "NeverOverflow"
                        })
                    });
                    oHeaderToolbar.addContent(oSearchField);

                    //Botón para abrir popu de cargar Excel
                    var oButtonSeleccionarTipoCarga = new sap.m.Button({
                        text: "Cargar Facturas",
                        icon: "sap-icon://enter-more",
                        press: this.onMostrarSeleccionEstructuraExcel.bind(this, TypeTable)
                    });

                    oHeaderToolbar.addContent(oButtonSeleccionarTipoCarga);

                    // Crear el botón con icono
                    var oButtonDescargarExcel = new sap.m.Button({
                        text: "",
                        tooltip: "Descargar Excel",
                        icon: "sap-icon://download",
                        press: this.ExportExcel.bind(this, TypeTable)
                    });

                    oHeaderToolbar.addContent(oButtonDescargarExcel);



                    break;

                case "Vehiculos":
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
                        liveChange: this.onBusquedaRapida.bind(this, TypeTable),
                        showSearchButton: false,
                        layoutData: new sap.m.OverflowToolbarLayoutData({
                            maxWidth: "200px",
                            priority: "NeverOverflow"
                        })
                    });
                    oHeaderToolbar.addContent(oSearchField);

                    // Agregar FileUploader para cargar archivos TXT
                    /*   var oFileUploaderTXT = new sap.ui.unified.FileUploader({
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
   */
                    /*  // Agregar FileUploader para cargar archivos Excel
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
                      oHeaderToolbar.addContent(oFileUploaderExcel);*/

                    //Botón para abrir popu de cargar Excel
                    var oButtonSeleccionarTipoCarga = new sap.m.Button({
                        text: "Cargar Facturas",
                        icon: "sap-icon://enter-more",
                        press: this.onMostrarSeleccionEstructuraExcel.bind(this, TypeTable)
                    });

                    oHeaderToolbar.addContent(oButtonSeleccionarTipoCarga);

                    // Crear el botón con icono
                    var oButtonDescargarExcel = new sap.m.Button({
                        text: "",
                        tooltip: "Descargar Excel",
                        icon: "sap-icon://download",
                        press: this.ExportExcel.bind(this, TypeTable)
                    });

                    oHeaderToolbar.addContent(oButtonDescargarExcel);
                    break;

                case "Repuestos":
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
                        liveChange: this.onBusquedaRapida.bind(this, TypeTable),
                        showSearchButton: false,
                        layoutData: new sap.m.OverflowToolbarLayoutData({
                            maxWidth: "200px",
                            priority: "NeverOverflow"
                        })
                    });
                    oHeaderToolbar.addContent(oSearchField);

                    // Agregar FileUploader para cargar archivos TXT
                    /*   var oFileUploaderTXT = new sap.ui.unified.FileUploader({
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
   */
                    /*  // Agregar FileUploader para cargar archivos Excel
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
                      oHeaderToolbar.addContent(oFileUploaderExcel);*/

                    //Botón para abrir popu de cargar Excel
                    var oButtonSeleccionarTipoCarga = new sap.m.Button({
                        text: "Cargar Facturas",
                        icon: "sap-icon://enter-more",
                        press: this.onMostrarSeleccionEstructuraExcel.bind(this, TypeTable)
                    });

                    oHeaderToolbar.addContent(oButtonSeleccionarTipoCarga);

                    // Crear el botón con icono
                    var oButtonDescargarExcel = new sap.m.Button({
                        text: "",
                        tooltip: "Descargar Excel",
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

                case "Vehiculos":
                    oTable = new sap.m.Table({
                        id: "idCargaExcelVehiculoTable",
                        width: "auto",
                        items: {
                            path: "/ExcelVehiculos",
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

                case "Repuestos":
                    oTable = new sap.m.Table({
                        id: "idCargaExcelRepuestosTable",
                        width: "auto",
                        items: {
                            path: "/ExcelRepuestos",
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
                case "Vehiculos":
                    oTable.bindItems("/ExcelVehiculos", oColumnListItem);
                    break;
                case "Repuestos":
                    oTable.bindItems("/ExcelRepuestos", oColumnListItem);
                    break;
            }
        },
        createDynamicTable: function (TypeTable) {

            let oColumnListItem = that.CreateColumnListItem("Solicitudes"/*TypeTable*/);

            let oTable = that.GenerateTable(oColumnListItem, "Solicitudes" /*TypeTable*/);

            let oHeaderToolbar = that.CreateDynamicHeaderToolbar("Solicitudes"/*TypeTable*/);

            // agregamos el toolbar de encabezado en la tabla
            oTable.setHeaderToolbar(oHeaderToolbar);

            //Agregamos las columnas a la tabla
            let aColumns = that.ColumnsForDynamicTable(oTable, "Solicitudes" /*TypeTable*/);

            // Agregar celdas a los elementos de la tabla
            that.AddCellToColumnListItem(aColumns, oColumnListItem, "Solicitudes"/*TypeTable*/);

            // Agregar elementos a la tabla
            that.bindItemsToTable(oTable, oColumnListItem, "Solicitudes"/*TypeTable*/);

            // Devolver la tabla creada
            return oTable;

        },
        AddcontentToView: function (oTable) {
            var oView = this.getView();
            oView.addDependent(oTable);
            oView.byId("ContenedorTabla").addContent(oTable);
            //this._setListaSolicitudes({ filters: [] });
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

                case "Vehiculos":
                    var table = oView.byId("ContenedorTabla").getContent()[0];
                    var aData = MODEL.getProperty("/ExcelVehiculos");
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

                case "Repuestos":
                    var table = oView.byId("ContenedorTabla").getContent()[0];
                    var aData = MODEL.getProperty("/ExcelRepuestos");
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

                case "Vehiculos":
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
                case "Repuestos":
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
            if (this.byId("InputSelectProveedor").getBinding("suggestionItems") != undefined) {
                this.byId("InputSelectProveedor").getBinding("suggestionItems").filter(aFilters);
                this.byId("InputSelectProveedor").suggest();
            }
        },
        getProveedoresHelp: function (sValue = "") {
            let value = sValue.substr(0, 18);
            return new Promise((resolve, reject) => {
                ODataUtilidadesModel.read("/filtrosSet", {
                    filters: [
                        new Filter("i_value", FilterOperator.EQ, value),
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
        onSuggestCodSolicitud: async function (event) {
            var sValue = event.getParameter("suggestValue"),
                aFilters = [];
            sValue = sValue.toUpperCase();
            await this.getCodSolicitudHelp(sValue);
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
            if (this.byId("InputCodigoSolicitud").getBinding("suggestionItems") != undefined) {
                this.byId("InputCodigoSolicitud").getBinding("suggestionItems").filter(aFilters);
                this.byId("InputCodigoSolicitud").suggest();
            }

        },
        getCodSolicitudHelp: function (sValue = "") {
            return new Promise((resolve, reject) => {
                ODataUtilidadesModel.read("/filtrosSet", {
                    filters: [
                        new Filter("i_value", FilterOperator.EQ, sValue),
                        new Filter("i_object", FilterOperator.EQ, "SOLFACT"),
                        //new Filter("i_filter", FilterOperator.EQ, keyCentro)
                    ],
                    success: function (oData) {
                        if (oData.results.length) {
                            let aCodSolicitud = JSON.parse(oData.results[0].et_data);
                            /*for (let i = 0; i < aCodSolicitud.length; i++) {
                                aCodSolicitud[i].VALUE = parseInt(aCodSolicitud[i].VALUE).toString();
                            }*/

                            that.getView().setModel(new JSONModel(aCodSolicitud), "codSolicitudhelp");
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
        onSuggestCodFactura: async function (event) {
            var sValue = event.getParameter("suggestValue"),
                aFilters = [];
            sValue = sValue.toUpperCase();
            await this.getCodFacturaHelp(sValue);
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
            if (this.byId("InputCodigoFactura").getBinding("suggestionItems") != undefined) {
                this.byId("InputCodigoFactura").getBinding("suggestionItems").filter(aFilters);
                this.byId("InputCodigoFactura").suggest();
            }

        },
        getCodFacturaHelp: function (sValue = "") {
            return new Promise((resolve, reject) => {
                ODataUtilidadesModel.read("/filtrosSet", {
                    filters: [
                        new Filter("i_value", FilterOperator.EQ, sValue),
                        new Filter("i_object", FilterOperator.EQ, "FACTUR"),
                        //new Filter("i_filter", FilterOperator.EQ, keyCentro)
                    ],
                    success: function (oData) {
                        if (oData.results.length) {
                            let aProveedores = JSON.parse(oData.results[0].et_data);
                            that.getView().setModel(new JSONModel(aProveedores), "codFacturahelp");
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
        onProcesarDataExcel: function () {
            var TypeTable = "";
            // Obtener la referencia al RadioButtonGroup
            var oRadioButtonGroup = that.getView().byId("radioButtonGroup");

            // Obtener el índice del RadioButton seleccionado
            var selectedIndex = oRadioButtonGroup.getSelectedIndex();

            // Obtener el RadioButton seleccionado
            var selectedRadioButton = oRadioButtonGroup.getButtons()[selectedIndex];

            // Obtener el texto del RadioButton seleccionado
            var selectedText = selectedRadioButton.getText();


            switch (selectedIndex) {

                case 0:
                    TypeTable = "Repuestos";
                    break;

                case 1:
                    TypeTable = "Vehiculos";
                    break;

            }

            let file = that.getFileFromUploader();
            if (file) {
                let SeleccionEstructura = that._dialogs["SeleccionarEstructuraExcel"];
                SeleccionEstructura.close();
                that.onReadExcel(file, TypeTable);
            }
            else {

            }
        },
        getFileFromUploader: function () {
            // Obtén una referencia al FileUploader por su ID
            var oFileUploader = that.getView().byId("onFileSelectExcel");

            // Obtén la lista de archivos cargados
            var aFiles = oFileUploader && oFileUploader.getValue() ? oFileUploader.oFileUpload.files : [];

            // Verifica si hay algún archivo cargado
            if (aFiles.length > 0) {
                // Accede al primer archivo en la lista
                var oFile = aFiles[0];

                // Retorna el objeto de archivo
                return oFile;
            } else {
                // Retorna null si no hay archivo seleccionado
                return null;
            }
        },
        buildArrayFromDataExcel: function (DataExcel, TypeTable) {

            var resultData = [];
            DataExcel.forEach(function (item) {
                var jsonObject = {};
                if (TypeTable == "Repuestos") {
                    jsonObject.Sociedad = item["SOCIEDAD"]
                    jsonObject.Item = item["ITEM"]
                    jsonObject.TipoDocumento = item["TIPO DE DOCUMENTO DE COMPRAS"]
                    jsonObject.ClaseDocumento = item["CLASE DE DOCUMENTO DE COMPRAS"]
                    jsonObject.NroPedido = item["No PEDIDO"]
                    jsonObject.Proveedor = item["PROVEEDOR"]
                    jsonObject.OrganizacionCompras = item["ORGANIZACIÓN DE COMPRAS"]
                    jsonObject.GrupoCompras = item["GRUPO DE COMPRAS"]
                    jsonObject.Material = item["MATERIAL"]
                    jsonObject.Cantidad = item["CANTIDAD"]
                    jsonObject.PrecioNeto = item["PRECIO NETO"]
                    jsonObject.Solped = item["SOLPED"]
                    jsonObject.ValorTotal = item["VALOR TOTAL"]
                    jsonObject.Caja = item["CAJA"]
                    jsonObject.PaisOrigen = item["PAIS DE ORIGEN"]
                    jsonObject.Centro = item["CENTRO"]
                    jsonObject.Almacen = item["ALMACEN"]
                    jsonObject.Unidad = item["UNIDAD"]
                    jsonObject.NumeroBl = item["NUMERO BL"]
                    jsonObject.FechaBl = item["FECHA BL"]
                    jsonObject.PuertoSalida = item["PUERTO DE SALIDA"]
                    jsonObject.Puertollegada = item["PUERTO DE LLEGADA"]
                    jsonObject.Icoterms = item["ICOTERMS"]
                    jsonObject.LugarIncoterms = item["LUGAR INCOTERMS"]
                    jsonObject.ViaTransporte = item["VIA TRANSPORTE"]
                }
                else {
                    jsonObject.NumFactura = item["N° DE FACT"]
                    jsonObject.Caja = item["CAJA"]
                    jsonObject.NumOrden = item["N° DE ORDEN"]
                    jsonObject.NumParte = item["N° DE PARTE"]
                    jsonObject.Item = item["ITEM"]
                    jsonObject.Descripcion = item["DESCRIPCIÓN"]
                    jsonObject.Origen = item["ORIGEN"]
                    jsonObject.Peso = item["PESO (KGRS)"]
                    jsonObject.Fob = item["FOB"]
                    jsonObject.Cant = item["CANT"]
                    jsonObject.Total = item["TOTAL"]
                }
                resultData.push(jsonObject);
            });

            return resultData;
        },
        onAbrirFileUploader: function () {
            let fileUploader = this.getView().byId("onFileSelectExcel");
            fileUploader.$().find('input').click();
        },
        onValidarFormatos: function (objElement, typeTable) {
            let mensajes = [];
            let obj = { "mensaje": [], "valid": true }
            const elementosRequeridosRepuestos = [
                "SOCIEDAD",
                "ITEM",
                "TIPO DE DOCUMENTO DE COMPRAS",
                "CLASE DE DOCUMENTO DE COMPRAS",
                "No PEDIDO",
                "PROVEEDOR",
                "ORGANIZACIÓN DE COMPRAS",
                "GRUPO DE COMPRAS",
                "MATERIAL",
                "CANTIDAD",
                "PRECIO NETO",
                "SOLPED",
                "VALOR TOTAL",
                "CAJA",
                "PAIS DE ORIGEN",
                "CENTRO",
                "ALMACEN",
                "UNIDAD",
                "NUMERO BL",
                "FECHA BL",
                "PUERTO DE SALIDA",
                "PUERTO DE LLEGADA",
                "ICOTERMS",
                "LUGAR INCOTERMS",
                "VIA TRANSPORTE"
            ];

            const elementosRequeridosVehiculos = [
                "N° DE FACT",
                "CAJA",
                "N° DE ORDEN",
                "N° DE PARTE",
                "ITEM",
                "DESCRIPCIÓN",
                "ORIGEN",
                "PESO (KGRS)",
                "FOB",
                "CANT",
                "TOTAL"
            ];

            let elementosRequeridos;
            switch (typeTable) {
                case "Vehiculos":
                    elementosRequeridos = elementosRequeridosVehiculos;
                    break;
                case "Repuestos":
                    elementosRequeridos = elementosRequeridosRepuestos;
                    break;
                default:
                    console.error("Tipo de tabla no válido.");
                    return { "mensaje": "Tipo de tabla no válido.", "valid": false };
            }

            for (const elementoRequerido of elementosRequeridos) {
                if (!(elementoRequerido in objElement)) {
                    mensajes.push(`El elemento "${elementoRequerido}" no está presente en la estructura del Excel`);
                    obj.valid = false;
                }
            }

            obj.mensaje = that.formatMessagesAsHTML(mensajes);

            return obj;
        },
        formatMessagesAsHTML: function (Mensaje) {
            let NuevoMensaje = "";
            let count = 0;
            Mensaje.map((mensaje) => {
                count++;
                NuevoMensaje = NuevoMensaje + count + ". " + mensaje + ".<br>";
            });
            return NuevoMensaje;
        }
    });
});
