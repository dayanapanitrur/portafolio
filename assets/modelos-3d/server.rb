# Servidor local para previsualizar el modelo (sin instalar nada: usa el Ruby de macOS).
#   ruby server.rb        → http://localhost:8123
# Además de servir archivos, acepta POST /save?name=archivo.glb para guardar en dist/
# el GLB que genera tools/generar-glb.html en el navegador.
require 'webrick'

ROOT = File.expand_path(__dir__)
DIST = File.join(ROOT, 'dist')
Dir.mkdir(DIST) unless Dir.exist?(DIST)

server = WEBrick::HTTPServer.new(Port: 8123, DocumentRoot: ROOT, BindAddress: '127.0.0.1')
server.config[:MimeTypes]['glb'] = 'model/gltf-binary'
server.config[:MimeTypes]['gltf'] = 'model/gltf+json'
server.config[:MimeTypes]['mjs'] = 'text/javascript'

server.mount_proc '/save' do |req, res|
  if req.request_method != 'POST'
    res.status = 405
    next
  end
  params = WEBrick::HTTPUtils.parse_query(req.query_string.to_s)
  name = File.basename(params['name'].to_s)
  unless name =~ /\A[\w\-.]+\.(glb|png)\z/
    res.status = 400
    res.body = 'nombre inválido'
    next
  end
  File.binwrite(File.join(DIST, name), req.body)
  res.body = "guardado dist/#{name} (#{req.body.bytesize} bytes)"
end

trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }
server.start
