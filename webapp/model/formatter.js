sap.ui.define([
    "sap/ui/core/format/NumberFormat",
    "../utils/valoresEstadoFactura",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/library"
], function (NumberFormat,
    valoresEstadoFactura,
    DateFormat, coreLibrary) {
    "use strict";

    return {

        /**
         * Rounds the number unit value to 2 digits
         * @public
         * @param {string} sValue the number string to be rounded
         * @returns {string} sValue with 2 digits rounded
         */
        numberUnit: function (sValue) {
            if (!sValue) {
                return "";
            }
            return parseFloat(sValue).toFixed(2);
        },

        formatDateView: function (date) {
            if (!date) return "";
            const format = DateFormat.getDateInstance({
                pattern: "dd.MM.yyyy",
                // format:"yyyy-MM-dd",
                UTC: true
            });
            return format.format(date);
        },

        formatDateImportacion: function (date) {
            if (!date) return "";
            if (typeof date !== "string") return;
            let year = date.split("-")[0];
            let month = date.split("-")[1];
            let day = date.split("-")[2];
            return new Date(year, month, day);
        },

        formatDateParameter: function (date) {
            if (!date) return "";
            const format = DateFormat.getDateInstance({
                pattern: "yyyy-MM-ddTHH:mm:ss",
                // format:"yyyy-MM-dd",
                UTC: true
            });
            return format.format(date);
        },

        formatCurrency: function (value) {
            
            const formato = NumberFormat.getCurrencyInstance({
                "currencyCode": false,
                "groupingSeparator": ",",
                "decimalSeparator": ".",
                "customCurrencies": {
                    "Sol": {
                        "isoCode": "PEN",
                        "symbol": "S/",
                        "decimals": 2
                    }
                }
            });
            const formatValue = formato.format(value);
            return `S/ ${formatValue}`;
        },

        formatValueStateEstadoFactura: function (value) {
            if (!value) return "";
            return valoresEstadoFactura[value];
        },

        formatValueStateProcess: function (value1, value2) {
            if (!value1 || !value2) return "";
            if (value1 === value2) {
                return valoresEstadoFactura[value1];
            }
            return "None";
        },

        formatValueStateTextEstadoSolicitud: function (value) {
            if (!value) return "";
            const states = {
                1: "Se ha seleccionado pendientes",
                2: "Se ha seleccionado aprobadas",
                3: "Se ha seleccionado rechazadas"
            }
            return states[value];
        },

        formatearFechaString: function (fecha) {
            if (!fecha) return "";

            // Verificar si la fecha es un objeto Date
            if (fecha instanceof Date) {
                let anio = fecha.getFullYear();
                let mes = (fecha.getMonth() + 1).toString().padStart(2, '0'); // Meses son 0-indexados
                let dia = fecha.getDate().toString().padStart(2, '0');
                return `${dia}.${mes}.${anio}`;
            } else if (typeof fecha === 'string') {
                // Si la fecha es una cadena en formato "YYYY-MM-DD"
                let [anio, mes, dia] = fecha.split('-');
                return `${dia}.${mes}.${anio}`;
            } else {
                // Manejar otros casos según sea necesario
                return "";
            }
        },

        formatEstados: function (value) {
            const valueState = coreLibrary.MessageType;
            let estado;
            switch (value) {
                case "CR":
                    estado = valueState.None;
                    break;
                case "EN":
                    estado = valueState.Information;
                    break;
                case "PR":
                    estado = valueState.Warning;
                    break;
                case "PA":
                    estado = valueState.Success;
                    break;
                case "OB":
                    estado = valueState.Error;
                    break;
                default:
                    estado = valueState.Information;
                    break;
            }
            return estado;
        },

        formatEstados2: function (value) {
            const valueState = coreLibrary.MessageType;
            let estado;
            switch (value) {
                case "CR":
                    estado = "Creada";
                    break;
                case "EN":
                    estado = "Enviada";
                    break;
                case "PR":
                    estado = "Procesada";
                    break;
                case "PA":
                    estado = "Pagada";
                    break;
                case "OB":
                    estado = "Observada";
                    break;
                default:
                    estado = "";
                    break;
            }
            return estado;
        },

        formatEstados3: function (value) {
            let estado;
            switch (value) {
                case "CR":
                    estado = "sap-icon://create";
                    break;
                case "EN":
                    estado = "sap-icon://paper-plane";
                    break;
                case "PR":
                    estado = "sap-icon://in-progress";
                    break;
                case "PA":
                    estado = "sap-icon://paid-leave";
                    break;
                case "OB":
                    estado = "sap-icon://decline";
                    break;
                default:
                    estado = "";
                    break;
            }
            return estado;
        },

        formatDateToString: function (date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Agrega un 0 si es necesario
            const day = String(date.getDate()).padStart(2, '0'); // Agrega un 0 si es necesario
            return `${year}${month}${day}`;
        }

    };

});