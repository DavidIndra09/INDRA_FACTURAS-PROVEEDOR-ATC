sap.ui.define([
    "../controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter",
    "sap/m/MessageBox",
], function (BaseController, JSONModel, History, Filter, FilterOperator, formatter, MessageBox) {
    "use strict";

    let that,
        viewModel,
        facturaModel,
        ODataUtilidadesModel,
        AdjuntosOriginal = [],
        AdjuntosEliminados = [],
        ODATA_SAP;

    return BaseController.extend("usil.com.createinvoice.atc.detalle.Detalle", {

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
                delay: 0,
                visibleconpedido:false,
                visiblepos:true
            });


            facturaModel = this.getOwnerComponent().getModel("facturaModel");
            ODATA_SAP = this.getOwnerComponent().getModel("ODATA_SAP");
            sap.ui.getCore().setModel(new JSONModel({ "Posiciones": [] }), "Detalle"); 
            ODataUtilidadesModel = this.getOwnerComponent().getModel("ODataUtilidadesModel");
            this.getRouter().getRoute("detalle").attachPatternMatched(this._onDetalletMatched, this);
            this.setModel(viewModel, "detalleView");
            this.setModel(new JSONModel([]), "Adjuntos");
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
            try{            
            sap.ui.core.BusyIndicator.show();
            this.getRouter().navTo("solicitudes", {}, true);        
            }
            catch(error){
                sap.ui.core.BusyIndicator.hide();  
                const errorType = "error";
                MessageBox[errorType]("Se produjo un error al tratar de navegar al reporte de solicitudes: " + error.message);
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
        _onDetalletMatched: async function (oEvent) {
            if (that.getOwnerComponent().getModel("oCabecera")) {
                that.onInitStateInputs();
                var oParameters = oEvent.getParameters();
                let oObject = that.getOwnerComponent().getModel("oCabecera").getData();
                oObject.total = (parseFloat(that.convertirFormato(oObject.IMPORT) * 1.19)).toFixed(2); /* Number(oObject.IGV)).toFixed(2)*/;
                oObject.total = formatter.formatCurrency(oObject.total);
                oObject.enabled = (oObject.DescripcionEstado == "Creado" || oObject.DescripcionEstado == "Rechazado" || oObject.DescripcionEstado == "Con Errores") ? true : false;
                
                await this.getwaershelp((oObject.WAERS).split("-")[0]);                
                let waersCollection = that.getView().getModel("waershelp").getData();
                var find = waersCollection.find(item=> item.VALUE == oObject.WAERS.split("-")[0].trim());
                oObject.WAERS =  find.VALUE + " - " +find.TEXTO;
                that.mostrarDetalle(oParameters.arguments.codigoSolicitud, oObject, oParameters.arguments.posiciones); 
                that.getOwnerComponent().getModel("oCabecera").refresh(true);
                const resourceBundle = this.getResourceBundle();
                viewModel.setProperty("/detalleViewTitle", resourceBundle.getText("detalleViewTitle", [oParameters.arguments.codigoSolicitud]));
                viewModel.setProperty("/detalleViewSubTitle", resourceBundle.getText("detalleViewSubTitle", [oParameters.arguments.proveedor]));
                viewModel.setProperty("/busy", false);
                viewModel.setProperty("/busy", false);
            } else {
                viewModel.setProperty("/busy", false);
                that.onNavBack();
            }          
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
        buildModelDetail: function(oData){
            let data = []
            $.each(oData, function (i, item) {
                data.push({
                     "EBELN":"",
                     "EBELP":item.POSNR,
                     "MATNR":item.MATERIAL,
                     "TXZ01":"",
                     "MEINS":item.M3_UNIT,
                     "MENGE": item.CANTIDAD ,
                     "NETPR":parseFloat(item.FOB_U || 0) + parseFloat(item.FLETE || 0) + parseFloat(item.SEGURO || 0),
                     "WAERS":item.MONEDA
                });
            });

            return data;    
        },
        mostrarDetalle: function (sCODEFACT, oCabecera, posiciones) {
            sap.ui.core.BusyIndicator.show(0);
            const resourceBundle = that.getResourceBundle();
            let aFilters = [];
            var aLista = []
            let Detalle = [];
            var sumatoria = 0; 
            aFilters.push(new Filter("I_SOLFAC", FilterOperator.EQ, sCODEFACT));
            aFilters.push(new Filter("I_BUKRS", FilterOperator.EQ, "1000"));
            ODATA_SAP.read("/getDetailSolFactSet", {
                filters: aFilters,
                success: function (data) {
                    
                    sap.ui.core.BusyIndicator.hide();                    
                    if(data.results[0].ET_COND!="[]"){
                        viewModel.setProperty("/visibleconpedido", true);
                        viewModel.setProperty("/visiblepos", false);
                        Detalle = data.results[0].ET_COND;
                        aLista = JSON.parse(Detalle);
                    }
                    else{
                        viewModel.setProperty("/visibleconpedido", false);
                        viewModel.setProperty("/visiblepos", true);
                        Detalle = (oCabecera.TIPDAT== "XLSVEH")?data.results[0].ET_DETVE:data.results[0].ET_DET;
                    
                        if(oCabecera.TIPDAT== "XLSVEH"){
                            aLista = that.buildModelDetail(JSON.parse(Detalle));
                        }
                        else{
                             aLista = JSON.parse(Detalle);
                        }
                    }

                     
                    let Documentos = data.results[0].ET_DOC;                    
                    
                    //if (posiciones.length > 0) {
                        let posicionesParse = sap.ui.getCore().getModel("Detalle").getData().Posiciones;//JSON.parse(posiciones);
                        if(posicionesParse.length>0){
                            aLista.push(...posicionesParse);
                        }
                        
                    //}   
                    sap.ui.getCore().setModel(new JSONModel({ "Posiciones": [] }), "Detalle"); //limpiamos las posiciones                 
                    var VisibleTable =   viewModel.getProperty("/visibleconpedido") ;
                    sumatoria = (VisibleTable)?that.sumarPorEBELN(aLista):0 ;
                    $.each(aLista, function (i, item) {
                       
                        if(VisibleTable){
                            
                            item.TOTAL = ((parseFloat(that.convertirFormato(item.KBETR)))).toFixed(2);
                        }
                        else{
                            sumatoria = sumatoria + (parseFloat(that.convertirFormato(item.NETPR)) * parseFloat(that.convertirFormato(item.MENGE)) ); 
                            item.TOTAL = ((parseFloat(that.convertirFormato(item.NETPR)) * parseFloat(that.convertirFormato(item.MENGE)) )).toFixed(2);
                        }
                        
                        item.WAERS = oCabecera.WAERS.split("-")[0];
                        
                    });
                    let aListaDocumentos = JSON.parse(Documentos);
                    let adjuntos = [];
                    that.getView().byId("btnAddCondPedido").setEnabled(oCabecera.Edit);
                    that.getView().byId("btnAddPosiciones").setEnabled(oCabecera.Edit);
                    that.getView().byId("AdjuntosUploader").setEnabled(oCabecera.Edit);
                    that.getView().byId("btnEliminarPosiciones").setEnabled(oCabecera.Edit);
                    that.getView().byId("btnEliminarCondPedido").setEnabled(oCabecera.Edit);                    
                    
                    $.each(aListaDocumentos, function (i, item) {

                        adjuntos.push({
                            "lastModifiedDate": that.convertirCadenaAFecha(item.DATUM),
                            "name": item.FILENAME,
                            "type": item.FILETYPE,
                            "mimeType": item.FILETYPE,
                            "solfac": item.SOLFAC,
                            "posnr": item.POSNR,
                            "base64": item.BASE64,
                            "actions": (oCabecera.DescripcionEstado == "Creado") ? true : false
                        });
                    });

                    aLista.sort((a, b) => a.POSNR - b.POSNR);                    
                    let oModelLista = new JSONModel(aLista);
                    oModelLista.setSizeLimit(99999999999)   
                    //that.getView().byId("sumatoriaImporte").setText(formatter.formatCurrency(sumatoria)); 
                    let sTitlePositionTable = resourceBundle.getText("detalleViewTableSection");
                    let sTitleAjuntosTable = resourceBundle.getText("detalleViewAdjuntos");
                    (data.results[0].ET_COND!="[]")?that.byId("idTableCondicionesPedido").setModel(oModelLista):that.byId("idtablaFactura").setModel(oModelLista);                    
                    that.byId("tableSection").setTitle(sTitlePositionTable + " (" + aLista.length + ")");
                    that.getView().byId("AdjuntosDetalle").setModel(new JSONModel({ "Adjuntos": adjuntos }));
                    that.byId("adjuntosPageSection").setTitle(sTitleAjuntosTable + " (" + adjuntos.length + ")");
                    that.getView().byId("sumatoriaImporte").setText(formatter.formatCurrency(sumatoria));
                    that.getView().byId("sumatoriaImporteCP").setText(formatter.formatCurrency(sumatoria));
                    AdjuntosOriginal = [...adjuntos];
                },
                error: function (err) {
                    var error = err;
                    console.log(error);
                    MessageBox.error("Error al listar el detalle de la factura");
                    sap.ui.core.BusyIndicator.hide();
                }
            });
        },
        sumarPorEBELN: function (oData) {
            let primerValorPorEBELN = {};
            let sumarTodos = true;
        
            oData.forEach(item => {
                let element = item;
                let ebeln = element.EBELN;
                let kbetr = parseFloat(that.convertirFormato(element.KBETR));
                let bsart = element.BSART;
        
                // Verificar si no hemos sumado KBETR para este EBELN
                if (primerValorPorEBELN[ebeln] === undefined) {
                    primerValorPorEBELN[ebeln] = kbetr;
                }
        
                // Verificar la condición de BSART
                if (bsart === "ZVEM") {
                    sumarTodos = true; // Establecer a true si encontramos al menos un BSART igual a ZVEM
                }
            });
        
            let resultado;
        
            if (sumarTodos) {
                // Sumar todos los valores de KBETR si al menos un BSART es igual a ZVEM
                resultado = Object.values(primerValorPorEBELN).reduce((total, valor) => total + valor, 0);
            } else {
                // Obtener solo el primer valor de KBETR para cada valor único de EBELN
                resultado = Object.values(primerValorPorEBELN).reduce((total, valor) => {
                    return total + valor;
                }, 0);
            }
        
            return resultado.toFixed(2);
        },
        convertirCadenaAFecha(cadenaFecha) {
            // Dividir la cadena en partes: año, mes, día
            const partesFecha = cadenaFecha.split('-');
            // Crear un objeto Date con las partes de la fecha
            // Nota: El mes en JavaScript es 0-indexado, por lo que restamos 1 al mes
            const fecha = new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2]);

            return fecha;
        },
        onCargaAdjuntos: async function (event) {
            const adjuntos = that.getView().byId("AdjuntosDetalle").getModel().getData().Adjuntos;
            const files = event.getParameter("files");
            const fileUploader = that.getView().byId("AdjuntosUploader");
            if (files.length > 0) {
                const file = files[0];
                let exist = that.onAttachmentExist(file);
                if (exist) {
                    sap.m.MessageToast.show("El archivo ya se encuentra cargado.");
                    fileUploader.setValue("");
                    return;
                }
                const base64String = await that.readFileAsBase64(file);
                adjuntos.push({
                    "posnr": 0,
                    "lastModifiedDate": new Date(),
                    "name": that.obtenerNombreSinExtension(file.name),//file.name.split(".")[0],
                    "type": "." + file.name.split(".").pop(),
                    "mimeType": file.type,
                    "base64": base64String
                });
                that.getView().byId("AdjuntosDetalle").setModel(new JSONModel({ "Adjuntos": adjuntos }));
                fileUploader.setValue("");
            }
            //control.setValue("");
        },
        obtenerNombreSinExtension(nombreArchivo) {
            const partes = nombreArchivo.split(".");
            // Obtener todos los elementos excepto el último
            const nombreSinExtension = partes.slice(0, -1).join(".");
            return nombreSinExtension;
        },
        onAttachmentExist: function (file) {
            let exist = false;
            let adjuntos = that.getView().byId("AdjuntosDetalle").getModel().getData().Adjuntos;
            $.each(adjuntos, function (i, item) {
                if (item.name == file.name.split(".")[0] && item.type == ("." + file.name.split(".").pop())) {
                    exist = true;
                }
            });
            return exist;
        },
        onObtenerPosicionAdjunto: function () {
            const adjuntos = AdjuntosOriginal || [];
            const mayorPosnr = adjuntos.reduce((max, adjunto) => {
                const posnr = adjunto.posnr || 0;
                return posnr > max ? posnr : max;
            }, 0);
            return mayorPosnr;
        },
        readFileAsBase64: function (file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = () => {
                    resolve(reader.result.split(',')[1]);
                };

                reader.onerror = (error) => {
                    reject(error);
                };

                reader.readAsDataURL(file);
            });
        },
        downloadFromBase64: function (event) {
            let fila = event.getSource().getBindingContext().getProperty();
            var byteCharacters = atob(fila.base64);
            var byteNumbers = new Array(byteCharacters.length);
            for (var i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            var byteArray = new Uint8Array(byteNumbers);
            var blob = new Blob([byteArray], { type: fila.mimeType });

            // Crear un enlace de descarga
            var link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fila.name + fila.type;

            // Simular un clic en el enlace para iniciar la descarga
            link.click();
        },
        onEliminarAdjunto: function (oEvent) {
            var oButton = oEvent.getSource();
            var oListItem = oButton.getParent();
            var iIndex = oListItem.getBindingContextPath().split("/").pop();
            var oTable = that.getView().byId("AdjuntosDetalle");
            var oModel = oTable.getModel();
            var aItems = oModel.getProperty("/Adjuntos");
            sap.m.MessageBox.confirm("¿Estás seguro de que deseas eliminar este archivo?", {
                title: "Confirmar eliminación",
                onClose: function (oAction) {
                    if (oAction === sap.m.MessageBox.Action.OK) {
                        AdjuntosEliminados.push(aItems[iIndex]);
                        aItems.splice(iIndex, 1);
                        oModel.setProperty("/Adjuntos", aItems);
                    }
                }
            });
        },
        _getDataFactura: function () {
            let posiciones = that.byId("idtablaFactura").getModel().getData();
            let adjuntos = that.getView().byId("AdjuntosDetalle").getModel().getData().Adjuntos;
            let cabecera = that.getOwnerComponent().getModel("oCabecera").getData();
            let PosnrMax = that.onObtenerPosicionAdjunto();
            //let posnr = 0;
            const adjuntoModel = adjuntos.map((item, index) => {
                //posnr = posnr + 10
                //PosnrMax = PosnrMax + 10;
                let cont = 0;
                if (index == 0) {
                    cont = 1;
                } else {
                    cont = index + 1;
                }
                return {
                    "POSNR": (item.posnr == 0) ? (PosnrMax + (cont * 10)).toString() : item.posnr.toString(),//posnr,
                    "DATUM": that.convertirFechaAFormatoYMD(item.lastModifiedDate),
                    "BASE64": item.base64,
                    "SOLFAC": cabecera.SOLFAC,
                    "FILETYPE": item.type,
                    "FILENAME": item.name,
                    "BORRADO": "",
                    "FBORRA": "",
                    "UBORRA": "",
                    "BUKRS": "1000"
                }
            });
            $.each(AdjuntosEliminados, function (i, item) {
                let find = AdjuntosOriginal.find(element => element.base64 == item.base64);
                if (find) {
                    //posnr = posnr + 10
                    adjuntoModel.push({
                        "POSNR": item.posnr.toString(),
                        "DATUM": that.convertirFechaAFormatoYMD(item.lastModifiedDate),
                        "BASE64": item.base64,
                        "SOLFAC": cabecera.SOLFAC,
                        "FILETYPE": item.type,
                        "FILENAME": item.name,
                        "BORRADO": "X",
                        "FBORRA": that.convertirFechaAFormatoYMD(new Date()),
                        "UBORRA": "",//sap.ui.getCore().getModel("USERIAS").getData().USERIAS,
                        "BUKRS": "1000"
                    });
                }
            });

            const conformidades = posiciones.map(item => {
                return {
                    "mandt": "",
                    "bukrs": item.BUKRS,
                    "lifnr": sap.ui.getCore().getModel("Lifnr").getData().Lifnr,
                    "codefact": "",
                    "posnr": item.BUZEI,
                    "datre": "20001102",
                    "ebeln": item.EBELN,
                    "lblni": "",
                    "ebelp": item.EBELP,
                    "matnr": item.MATNR,
                    "tipod": "B",
                    "menge": item.MENGE,
                    "meins": item.MEINS,
                    "NETPR": item.NETPR,
                    "waers": item.WAERS,
                    "txz01": item.TXZ01,
                    "belnr": item.BELNR,
                    //"solfac": item.SOLFAC,
                    "mwskz": item.MWSKZ
                }
            });



            let oReturn = that.ongetModelCabecera(cabecera);
            
            /*{
                "ESTADO": cabecera.ESTADO,
                "WAERS": cabecera.WAERS.split("-")[0].trim(),
                "LIFNR": sap.ui.getCore().getModel("Lifnr").getData().Lifnr,
                "FACTUR": cabecera.FACTUR,
                "FEMISI": that.formatFecha(cabecera.FEMISI),
                "IMPORT": that.convertirFormato(cabecera.IMPORT.toString()),
                "FCRESO": that.formatFecha(cabecera.FCRESO),
                "SOLFAC": cabecera.SOLFAC
            }
            */
            let obj = {
                "IS_CAB": JSON.stringify(oReturn),
                "IT_DET": JSON.stringify(conformidades),
                "IT_DOC": JSON.stringify(adjuntoModel)
            };
            

            return obj;
        },
        ongetModelCabecera:function(Data){
            
            return {
                "INCO1": Data.INCO1,
                "INCO2": Data.INCO2,
                "NUMFA": Data.NUMFA,
                "NUMBL": Data.NUMBL,
                "DATBL": Data.DATBL,
                "PRTSL": Data.PRTSL,
                "PRTEN": Data.PRTEN,
                "TPTRA": Data.TPTRA, 
                "EKGRP": Data.EKGRP,
                "EKORG": Data.EKORG,
                "EBELN": Data.EBELN,
                "TIPDAT": Data.TIPDAT,
                "ESTADO": (Data.EBELN!="" && (Data.TIPDAT == "XLSVEH" || Data.TIPDAT == "XLSREP"))?"09":Data.ESTADO,
                "WAERS": Data.WAERS.split("-")[0].trim() ,
                "LIFNR": Data.LIFNR,                
                "FEMISI": that.formatFecha(Data.FEMISI),
                "IMPORT": that.convertirFormato((Data.IMPORT).toString()),
                "SOLFAC": Data.SOLFAC,
                "FCRESO": that.formatFecha(Data.FCRESO),
                "BSART" : Data.BSART,
                "FACTUR": Data.FACTUR
            }

        },
        convertirFormato(valor) {
            // Reemplazar las comas con una cadena vacía
            const valorSinComas = valor.toString().replace(/,/g, '');

            // Convertir la cadena a un número
            const numero = parseFloat(valorSinComas);

            // Verificar si el valor es un número válido
            if (!isNaN(numero)) {
                // Formatear el número de nuevo a una cadena con dos decimales
                const valorFormateado = numero.toFixed(2);
                return valorFormateado;
            } else {
                // Manejar el caso en el que el valor no sea un número válido
                console.error('El valor no es un número válido:', valor);
                return valor;
            }
        },
        formatFecha: function (fecha) {
            var fechaFormateada = "";
            if(fecha.includes("/")){
                var [dia, mes, anio] = fecha.split('/');
                fechaFormateada = `${anio}${mes}${dia}`; 
            }
            else{
             var [dia, mes, anio] = fecha.split('.');
             fechaFormateada = `${anio}${mes}${dia}`;  
            }          
            return fechaFormateada;
        },
        onInitStateInputs:function(){
            //that.getView().byId("InputFactura").setValueState("None");
            that.getView().byId("FechaEmision").setValueState("None");
            that.getView().byId("InputImporte").setValueState("None");
            that.getView().byId("InputSelectWaers").setValueState("None");
            //that.getView().byId("InputPedido").setValueState("None")
        },
        onValidarCampos: function () {
            let valid = true;
            let oCabecera = that.getOwnerComponent().getModel("oCabecera").getData();
           /* if (oCabecera.FACTUR == "") {
                that.getView().byId("InputFactura").setValueState("Error")
                valid = false;
            }
            else {
                that.getView().byId("InputFactura").setValueState("None")
            }*/

            if (oCabecera.FEMISI == "") {
                that.getView().byId("FechaEmision").setValueState("Error")
                valid = false;
            }
            else {
                that.getView().byId("FechaEmision").setValueState("None")
            }
            if (oCabecera.IMPORT == "") {
                that.getView().byId("InputImporte").setValueState("Error")
                valid = false;
            }
            else {
                that.getView().byId("InputImporte").setValueState("None")
            }
            if (oCabecera.WAERS == "") {
                that.getView().byId("InputSelectWaers").setValueState("Error")
                valid = false;
            }
            else {
                that.getView().byId("InputSelectWaers").setValueState("None")
            }
          /*  if (oCabecera.EBELN == "") {
                that.getView().byId("InputPedido").setValueState("Error")
                valid = false;
            }
            else {
                that.getView().byId("InputPedido").setValueState("None")
            }
            */
            return valid;
        },
        actualizarFactura: async function () {
            try {
                sap.ui.core.BusyIndicator.show();
                let valid = that.onValidarCampos();
                if (!valid) {
                    MessageBox.warning("Completar todos los campos obligatorios");
                    sap.ui.core.BusyIndicator.hide()
                    return;
                }
                var data = this._getDataFactura();
                
                const request = await this.createEntity(ODATA_SAP, "/crearSolFactSet", data);
                const type = "success";
                sap.ui.core.BusyIndicator.hide();

                MessageBox[type](request.E_MSG, {
                    onClose: function () {
                        ODATA_SAP.refresh();
                        //sap.ui.core.BusyIndicator.hide();
                        this.getRouter().navTo("solicitudes", {}, false);
                    }.bind(this)
                });
            } catch (error) {             
                sap.ui.core.BusyIndicator.hide();
                const errorType = "error";
                MessageBox[errorType]("Se produjo un error al actualizar la factura. Error: " + error.message);
            }
        },
        convertirFechaAFormatoYMD(fecha) {
            // Asegurarse de que la entrada sea un objeto Date
            if (!(fecha instanceof Date)) {
                throw new Error('La entrada debe ser un objeto Date.');
            }

            // Obtener los componentes de la fecha
            const year = fecha.getFullYear();
            const month = String(fecha.getMonth() + 1).padStart(2, '0'); // Los meses son 0-indexados
            const day = String(fecha.getDate()).padStart(2, '0');

            // Construir la cadena en el formato yyyyMMdd
            const formatoYMD = `${year}${month}${day}`;

            return formatoYMD;
        },
        onNavOrdenes: function () {
            try {
            sap.ui.core.BusyIndicator.show();
            this.getRouter().navTo("orden", {}, false);
            }
            catch(error){
                sap.ui.core.BusyIndicator.hide();  
                const errorType = "error";
                MessageBox[errorType]("Se produjo un error al tratar de navegar a la selección de pedidos: " + error.message);
            }
        },
        onFileSizeExceed: function (oEvent) {
            sap.m.MessageToast.show("El adjunto no debe pesar más de 10 MB.");
        },
        onSuggestWaers: async function (event) {
            var sValue = event.getSource().getValue(),//event.getParameter("suggestValue"),
                aFilters = [];
            sValue = sValue.toUpperCase();
            await this.getwaershelp(sValue);
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
            if (this.byId("InputSelectWaers").getBinding("suggestionItems") != undefined) {
                this.byId("InputSelectWaers").getBinding("suggestionItems").filter(aFilters);
                //this.byId("InputSelectWaers").suggest();
            }
        },
        getwaershelp: function (sValue = "") {
            let value = sValue.substr(0, 18);
            return new Promise((resolve, reject) => {
                ODataUtilidadesModel.read("/filtrosSet", {
                    filters: [
                        new Filter("i_value", FilterOperator.EQ, value),
                        new Filter("i_object", FilterOperator.EQ, "WAERS")
                    ],
                    success: function (oData) {
                        if (oData.results.length) {
                            let aWaers = JSON.parse(oData.results[0].et_data);
                            that.getView().setModel(new JSONModel(aWaers), "waershelp");
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
        onCalcularImpuestoTotal: function (event) {
            const importeBase = event.getParameter("newValue");
            let total;
            total = (that.convertirFormato(importeBase) * 1.19).toFixed(2);
            let oCabecera = that.getOwnerComponent().getModel("oCabecera").getData();
            oCabecera.total = total;
            oCabecera.total = formatter.formatCurrency(oCabecera.total);
            oCabecera.IMPORT = importeBase;
            //oCabecera.IMPORT = formatter.formatCurrency(oCabecera.IMPORT);
            that.getOwnerComponent().getModel("oCabecera").refresh(true);
        },
        eliminarFilasSeleccionadas: function(table,messageConfirm) {
            var oTable = that.getView().byId(table); 
            var aSelectedItems = oTable.getSelectedItems();
        
            if (aSelectedItems.length > 0) {
                // Muestra un mensaje de confirmación
                sap.m.MessageBox.confirm(messageConfirm, {
                    title: "Confirmar",
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.OK) {
                            // Elimina las filas seleccionadas
                            aSelectedItems.forEach(function (oSelectedItem) {
                                oTable.removeItem(oSelectedItem);
                            });       
                          
                            // Limpia la selección después de borrar
                            oTable.removeSelections();
                            var data = [];
                           var Items =  oTable.getItems();
                           Items.forEach(function (oItem) {
                            var oBindingContext = oItem.getBindingContext();
                            var oRowData = oBindingContext.getObject();
                            data.push(oRowData);
                            
                        });
                           
                           that.byId("idtablaFactura").setModel(new JSONModel(data))
                        }
                    }
                });
            } else {
                // Muestra un mensaje si no hay filas seleccionadas
                sap.m.MessageToast.show("No hay filas seleccionadas para eliminar.");
            }
        }
        
    });

});
