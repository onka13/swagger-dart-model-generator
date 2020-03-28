const fs = require("fs");
const path = require("path");
var http = require("http");
var https = require("https");

// target folder for your models
var modelsDir = path.join("lib", "models");

// swagger.json url
var apiSwaggerUrl = "https://petstore.swagger.io/v2/swagger.json";

/* 
* header for your models. 
* do not forget to change utils path!
*/ 
var imports = `import 'libmodel.dart';
import 'package:mobilecore/utils.dart';
`;

/* 
* generate from file  
*/
//generate(fs.readFileSync(path.join("scripts", "swagger.json")));

/*
* generate from url
*/
generateFromUrl();

function generateFromUrl() {
  https.get(apiSwaggerUrl, res => {
    var data = "";
    res.on("data", function(chunk) {
      data += chunk;
    });
    res.on("end", function() {
      //fs.writeFileSync(path.join("scripts", "swaggerLast.json"), jsonStr);
      generate(data);
    });
  });
}

function generate(jsonStr) {
  var json = JSON.parse(jsonStr);
  var definitions = json["definitions"];

  var libModelOutput = "";
  for (const definitionKey in definitions) {
    if (definitionKey == "Object" || definitionKey.indexOf("Delta") != -1) {
      continue;
    }
    var definition = definitions[definitionKey];

    var output = imports;
    if (definition.type == "object") {
      output += `class ${definitionKey} {\n`;
      var constructorParams = "";
      var toStringParams = "";
      var fromJsonParams = "";
      var toJsonParams = "";
      for (const propName in definition.properties) {
        var niceName = toLowerFirstLetter(toCamelCase(propName));
        var property = definition.properties[propName];
        output += "\t" + getProperty(propName, property) + ";\n";
        constructorParams += "this." + niceName + ",";
        toStringParams += niceName + "=$" + niceName + ",";
        toJsonParams += "\t\t" + getToJsonProperty(propName, property) + ",\n";
        fromJsonParams +=
          "\t\t" + getFromJsonProperty(propName, property) + ";\n";
      }
      output += `\n\t${definitionKey}({${constructorParams}});\n`; // constructor

      // toString
      output += `
  @override
  String toString() {
    return '${definitionKey}[${toStringParams}]';
  }`;

      // fromJson
      output += `
  ${definitionKey}.fromJson(Map<String, dynamic> json) {
    if (json == null) return;
    ${fromJsonParams}\t}`;

      // toJson
      output += `
  Map<String, dynamic> toJson() {
    return {
      ${toJsonParams}
    };
  }
    `;

      // listFromJson & mapFromJson
      output += `
  static List<${definitionKey}> listFromJson(List<dynamic> json) {
    return json == null ? new List<${definitionKey}>() : json.map((value) => new ${definitionKey}.fromJson(value)).toList();
  }

  static Map<String, ${definitionKey}> mapFromJson(Map<String, Map<String, dynamic>> json) {
    var map = new Map<String, ${definitionKey}>();
    if (json != null && json.length > 0) {
      json.forEach((String key, Map<String, dynamic> value) => map[key] = new ${definitionKey}.fromJson(value));
    }
    return map;
  }    
    `;

      output += "\n}";
    }
    fs.writeFileSync(path.join(modelsDir, definitionKey + ".dart"), output);
    libModelOutput += "export '" + definitionKey + ".dart';\n";
  }
  fs.writeFileSync(path.join(modelsDir, "libmodel.dart"), libModelOutput);
  console.log("DONE");
}

function getProperty(name, property) {
  var camelCased = toLowerFirstLetter(toCamelCase(name));
  if (property.type == "array") {
    return `List<${getVariableType(property.items)}> ${camelCased}`;
  } else if (property.type == "object") {
    return `Map<String, ${getVariableType(
      property.additionalProperties
    )}> ${camelCased}`;
  }
  return getVariableType(property) + " " + camelCased;
}

function getFromJsonProperty(name, property) {
  var camelCased = toLowerFirstLetter(toCamelCase(name));
  var type = getVariableType(property.items || property);
  if (property.type == "array") {
    if (property.items["$ref"]) {
      return `${camelCased} = ${type}.listFromJson(json['${name}'])`;
    }
    //return `${camelCased} = (json['${name}'] as List).map((item) => item as ${type}).toList()`;
    return `${camelCased} = convertToList<${type}>(json['${name}'])`;
  } else if (property.type == "object") {
    return `${camelCased} = convertFromJson(json['${name}'], '${type}')`;
  } else if (property["$ref"]) {
    return `${camelCased} = ${type}.fromJson(json['${name}'])`;
  }
  return `${camelCased} = convertFromJson(json['${name}'], '${type}')`;
}

function getToJsonProperty(name, property) {
  var camelCased = toLowerFirstLetter(toCamelCase(name));
  var type = getVariableType(property.items || property);
  return `'${name}' : convertToJson(${camelCased}, '${type}')`;
}

function getVariableType(property) {
  var type;
  if (property["$ref"]) {
    type = property["$ref"].replace("#/definitions/", "");
  } else {
    type = property.format || property.type;
  }
  switch (type) {
    case "integer":
    case "int32":
    case "int64":
      return "int";
    case "string":
      return "String";
    case "date-time":
      return "DateTime";
    case "boolean":
      return "bool";
  }
  return type;
}

function toCamelCase(str) {
  return str.replace(/\_([a-z])/g, function(g) {
    return g[1].toUpperCase();
  });
}

function camelCaseTo(str) {
  return str.replace(/([a-z][A-Z])/g, function(g) {
    return g[0] + "_" + g[1].toLowerCase();
  });
}

function toLowerFirstLetter(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}
