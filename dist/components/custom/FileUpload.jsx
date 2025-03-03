"use strict";
// components/custom/FileUpload.tsx
"use client";
// components/custom/FileUpload.tsx
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FileUpload;
const axios_1 = __importDefault(require("axios"));
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const react_dropzone_1 = require("react-dropzone");
const input_1 = require("../ui/input");
const progress_1 = require("../ui/progress");
const scroll_area_1 = require("../ui/scroll-area");
const uuid_1 = require("uuid");
const sonner_1 = require("sonner");
const tooltip_1 = require("@/components/ui/tooltip"); // Importação dos componentes de Tooltip
var FileTypes;
(function (FileTypes) {
    FileTypes["Image"] = "image";
    FileTypes["Pdf"] = "pdf";
    FileTypes["Audio"] = "audio";
    FileTypes["Video"] = "video";
    FileTypes["Other"] = "other";
})(FileTypes || (FileTypes = {}));
const ImageColor = {
    bgColor: "bg-purple-600",
    fillColor: "fill-purple-600",
};
const PdfColor = {
    bgColor: "bg-blue-400",
    fillColor: "fill-blue-400",
};
const AudioColor = {
    bgColor: "bg-yellow-400",
    fillColor: "fill-yellow-400",
};
const VideoColor = {
    bgColor: "bg-green-400",
    fillColor: "fill-green-400",
};
const OtherColor = {
    bgColor: "bg-gray-400",
    fillColor: "fill-gray-400",
};
function FileUpload({ uploadedFiles, setUploadedFiles }) {
    const getFileIconAndColor = (file, mime_type) => {
        if (file) {
            if (file.type.includes(FileTypes.Image)) {
                return {
                    icon: <lucide_react_1.FileImage size={40} className={ImageColor.fillColor}/>,
                    color: ImageColor.bgColor,
                };
            }
            if (file.type.includes(FileTypes.Pdf)) {
                return {
                    icon: <lucide_react_1.File size={40} className={PdfColor.fillColor}/>,
                    color: PdfColor.bgColor,
                };
            }
            if (file.type.includes(FileTypes.Audio)) {
                return {
                    icon: <lucide_react_1.AudioWaveform size={40} className={AudioColor.fillColor}/>,
                    color: AudioColor.bgColor,
                };
            }
            if (file.type.includes(FileTypes.Video)) {
                return {
                    icon: <lucide_react_1.Video size={40} className={VideoColor.fillColor}/>,
                    color: VideoColor.bgColor,
                };
            }
        }
        else if (mime_type) {
            if (mime_type.includes(FileTypes.Image)) {
                return {
                    icon: <lucide_react_1.FileImage size={40} className={ImageColor.fillColor}/>,
                    color: ImageColor.bgColor,
                };
            }
            if (mime_type.includes(FileTypes.Pdf)) {
                return {
                    icon: <lucide_react_1.File size={40} className={PdfColor.fillColor}/>,
                    color: PdfColor.bgColor,
                };
            }
            if (mime_type.includes(FileTypes.Audio)) {
                return {
                    icon: <lucide_react_1.AudioWaveform size={40} className={AudioColor.fillColor}/>,
                    color: AudioColor.bgColor,
                };
            }
            if (mime_type.includes(FileTypes.Video)) {
                return {
                    icon: <lucide_react_1.Video size={40} className={VideoColor.fillColor}/>,
                    color: VideoColor.bgColor,
                };
            }
        }
        return {
            icon: <lucide_react_1.FolderArchive size={40} className={OtherColor.fillColor}/>,
            color: OtherColor.bgColor,
        };
    };
    const onDrop = (0, react_1.useCallback)(async (acceptedFiles) => {
        const newUploadedFiles = acceptedFiles.map((file) => ({
            id: (0, uuid_1.v4)(),
            file,
            progress: 0,
        }));
        setUploadedFiles((prev) => [...prev, ...newUploadedFiles]);
        // Iniciar o upload para o servidor
        newUploadedFiles.forEach((uploadedFile) => {
            uploadFile(uploadedFile);
        });
    }, [setUploadedFiles]);
    const { getRootProps, getInputProps } = (0, react_dropzone_1.useDropzone)({ onDrop, multiple: true });
    const uploadFile = async (uploadedFile) => {
        var _a, _b, _c;
        if (!uploadedFile.file)
            return; // Evita tentar fazer upload de mídias existentes
        const formData = new FormData();
        formData.append("file", uploadedFile.file);
        try {
            const response = await axios_1.default.post("/api/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                onUploadProgress: (progressEvent) => {
                    var _a;
                    const progress = Math.round((progressEvent.loaded / ((_a = progressEvent.total) !== null && _a !== void 0 ? _a : 0)) * 100);
                    setUploadedFiles((prev) => prev.map((file) => file.id === uploadedFile.id ? Object.assign(Object.assign({}, file), { progress }) : file));
                },
            });
            // Atualizar o arquivo com as informações retornadas pelo Baserow
            setUploadedFiles((prev) => prev.map((file) => file.id === uploadedFile.id
                ? Object.assign(Object.assign({}, file), { progress: 100, url: response.data.url, thumbnails: response.data.thumbnails, mime_type: response.data.mime_type, is_image: response.data.is_image, image_width: response.data.image_width, image_height: response.data.image_height, uploaded_at: response.data.uploaded_at, name: response.data.name, original_name: response.data.original_name, visible_name: response.data.visible_name }) : file));
            (0, sonner_1.toast)(`Upload de ${(_a = uploadedFile.file) === null || _a === void 0 ? void 0 : _a.name} concluído!`, {
                description: `Arquivo disponível em ${response.data.url}`,
            });
        }
        catch (error) {
            console.error(`Erro ao fazer upload de ${(_b = uploadedFile.file) === null || _b === void 0 ? void 0 : _b.name}:`, error);
            (0, sonner_1.toast)(`Erro ao fazer upload de ${(_c = uploadedFile.file) === null || _c === void 0 ? void 0 : _c.name}.`);
            // Remover o arquivo da lista em caso de erro
            setUploadedFiles((prev) => prev.filter((file) => file.id !== uploadedFile.id));
        }
    };
    const handleRemoveUploadedFile = (fileId) => {
        setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
        // Se necessário, adicione lógica para remover a mídia do backend
    };
    return (<tooltip_1.TooltipProvider>
      <div>
        {/* Área de Upload */}
        <div>
          <label {...getRootProps()} className="relative flex flex-col items-center justify-center w-full py-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-[#262626] hover:bg-gray-100 dark:hover:bg-gray-700 ">
            <div className="text-center">
              <div className="border p-2 rounded-md max-w-min mx-auto">
                <lucide_react_1.UploadCloud size={20}/>
              </div>

              <p className="mt-2 text-sm text-gray-600">
                <span className="font-semibold">Arraste os arquivos</span>
              </p>
              <p className="text-xs text-gray-500">
                Clique para enviar arquivos &#40;arquivos devem ter menos de 10 MB &#41;
              </p>
            </div>
          </label>

          <input_1.Input {...getInputProps()} id="dropzone-file" accept="image/png, image/jpeg, application/pdf, audio/*, video/*" type="file" className="hidden" multiple/>
        </div>

        {/* Arquivos em Upload */}
        {uploadedFiles.some((file) => file.progress < 100) && (<div>
            <scroll_area_1.ScrollArea className="h-40 mt-4">
              <p className="font-medium my-2 text-muted-foreground text-sm">
                Arquivos em Upload
              </p>
              <div className="space-y-2 pr-3">
                {uploadedFiles
                .filter((file) => file.progress < 100)
                .map((file) => {
                var _a, _b;
                return (<div key={file.id} className="flex justify-between gap-2 rounded-lg overflow-hidden border border-slate-100 group hover:pr-0 pr-2">
                      <div className="flex items-center flex-1 p-2">
                        <div className="text-white">
                          {getFileIconAndColor(file.file, file.mime_type).icon}
                        </div>

                        <div className="w-full ml-2 space-y-1">
                          <div className="text-sm flex justify-between">
                            <p className="text-muted-foreground ">
                              {(_a = file.file) === null || _a === void 0 ? void 0 : _a.name.slice(0, 25)}
                            </p>
                            <span className="text-xs">{file.progress}%</span>
                          </div>
                          <progress_1.Progress value={file.progress} className={getFileIconAndColor(file.file, file.mime_type).color}/>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveUploadedFile(file.id)} className="bg-red-500 text-white transition-all items-center justify-center cursor-pointer px-2 hidden group-hover:flex" aria-label={`Cancelar upload de ${(_b = file.file) === null || _b === void 0 ? void 0 : _b.name}`}>
                        <lucide_react_1.X size={20}/>
                      </button>
                    </div>);
            })}
              </div>
            </scroll_area_1.ScrollArea>
          </div>)}

        {/* Arquivos Uploadados */}
        {uploadedFiles.some((file) => file.progress === 100) && (<div>
            <scroll_area_1.ScrollArea className="h-40 mt-4">
              <p className="font-medium my-2 text-muted-foreground text-sm">
                Arquivos Uploadados
              </p>
              <div className="space-y-2 pr-3">
                {uploadedFiles
                .filter((file) => file.progress === 100)
                .map((file) => {
                var _a, _b;
                return (<div key={file.id} className="flex justify-between gap-2 rounded-lg overflow-hidden border border-slate-100 bg-white dark:bg-[#262626] text-black dark:text-[#49474A] group hover:pr-0 pr-2 hover:border-slate-300 transition-all">
                      <div className="flex items-center flex-1 p-2">
                        <tooltip_1.Tooltip>
                          <tooltip_1.TooltipTrigger asChild>
                            {((_b = (_a = file.thumbnails) === null || _a === void 0 ? void 0 : _a.small) === null || _b === void 0 ? void 0 : _b.url) ? (<img src={file.thumbnails.small.url} alt={file.original_name || file.visible_name || "Mídia"} className="w-12 h-12 object-cover rounded-md cursor-pointer"/>) : (<div className="text-white">
                                {getFileIconAndColor(undefined, file.mime_type).icon}
                              </div>)}
                          </tooltip_1.TooltipTrigger>
                          <tooltip_1.TooltipContent>
                            <p>{file.original_name || file.visible_name || "Mídia"}</p>
                          </tooltip_1.TooltipContent>
                        </tooltip_1.Tooltip>
                      </div>
                      <button onClick={() => handleRemoveUploadedFile(file.id)} className="bg-red-500 text-white transition-all items-center justify-center cursor-pointer px-2 hidden group-hover:flex" aria-label={`Remover ${file.original_name || file.visible_name || "Mídia"}`}>
                        <lucide_react_1.X size={20}/>
                      </button>
                    </div>);
            })}
              </div>
            </scroll_area_1.ScrollArea>
          </div>)}
      </div>
    </tooltip_1.TooltipProvider>);
}
