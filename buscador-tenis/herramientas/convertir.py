# Convierte la torre de imagen de SigLIP B/16-224 (big_vision, .npz) a ONNX.
# Además trae una implementación en numpy (independiente) para comprobar que el ONNX da lo mismo.
import sys, numpy as np, onnx
from onnx import helper as h, TensorProto as T, numpy_helper as nh

NPZ, SALIDA = sys.argv[1], sys.argv[2]
P = np.load(NPZ)
p = lambda k: P[f'params/img/{k}'].astype(np.float32)
D, H, HD, L = 768, 12, 64, 12

# ---------------- referencia numpy ----------------
def ln(x, pre):
    m = x.mean(-1, keepdims=True); v = ((x - m) ** 2).mean(-1, keepdims=True)
    return (x - m) / np.sqrt(v + 1e-6) * p(f'{pre}/scale') + p(f'{pre}/bias')
def gelu(x): return 0.5 * x * (1 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))
def mha(q_in, kv_in, pre):
    q = np.einsum('bnd,dhk->bnhk', q_in, p(f'{pre}/query/kernel')) + p(f'{pre}/query/bias')
    k = np.einsum('bnd,dhk->bnhk', kv_in, p(f'{pre}/key/kernel')) + p(f'{pre}/key/bias')
    v = np.einsum('bnd,dhk->bnhk', kv_in, p(f'{pre}/value/kernel')) + p(f'{pre}/value/bias')
    a = np.einsum('bqhk,bshk->bhqs', q / np.sqrt(HD), k)
    a = np.exp(a - a.max(-1, keepdims=True)); a /= a.sum(-1, keepdims=True)
    o = np.einsum('bhqs,bshk->bqhk', a, v)
    return np.einsum('bqhk,hkd->bqd', o, p(f'{pre}/out/kernel')) + p(f'{pre}/out/bias')
def mlp(x, pre):
    return gelu(x @ p(f'{pre}/Dense_0/kernel') + p(f'{pre}/Dense_0/bias')) @ p(f'{pre}/Dense_1/kernel') + p(f'{pre}/Dense_1/bias')
def referencia(img):  # img: [B,224,224,3] en [-1,1]
    B = img.shape[0]
    x = img.reshape(B, 14, 16, 14, 16, 3).transpose(0, 1, 3, 2, 4, 5).reshape(B, 196, 16 * 16 * 3)
    x = x @ p('embedding/kernel').reshape(-1, D) + p('embedding/bias') + p('pos_embedding')
    for i in range(L):
        b = f'Transformer/encoderblock_{i}'
        x = x + mha(ln(x, f'{b}/LayerNorm_0'), ln(x, f'{b}/LayerNorm_0'), f'{b}/MultiHeadDotProductAttention_0')
        x = x + mlp(ln(x, f'{b}/LayerNorm_1'), f'{b}/MlpBlock_0')
    x = ln(x, 'Transformer/encoder_norm')
    probe = np.tile(p('MAPHead_0/probe'), (B, 1, 1))
    y = mha(probe, x, 'MAPHead_0/MultiHeadDotProductAttention_0')
    y = y + mlp(ln(y, 'MAPHead_0/LayerNorm_0'), 'MAPHead_0/MlpBlock_0')
    return y[:, 0]

# ---------------- grafo ONNX ----------------
nodos, inits = [], []
cont = [0]
def nombre(base): cont[0] += 1; return f'{base}_{cont[0]}'
def const(arr, base='c'):
    n = nombre(base); inits.append(nh.from_array(np.asarray(arr), n)); return n
def op(tipo, ins, **attrs):
    out = nombre(tipo.lower()); nodos.append(h.make_node(tipo, ins, [out], **attrs)); return out
def ln_o(x, pre):
    return op('LayerNormalization', [x, const(p(f'{pre}/scale')), const(p(f'{pre}/bias'))], axis=-1, epsilon=1e-6)
def lin(x, W, b): return op('Add', [op('MatMul', [x, const(W)]), const(b)])
def gelu_o(x):
    x3 = op('Mul', [op('Mul', [x, x]), x])
    inner = op('Mul', [op('Add', [x, op('Mul', [x3, const(np.float32(0.044715))])]), const(np.float32(np.sqrt(2 / np.pi)))])
    return op('Mul', [op('Mul', [x, const(np.float32(0.5))]), op('Add', [op('Tanh', [inner]), const(np.float32(1.0))])])
SHAPE_HEADS = None
def mha_o(q_in, kv_in, pre):
    def proy(x, nom):
        W = p(f'{pre}/{nom}/kernel').reshape(D, H * HD); b = p(f'{pre}/{nom}/bias').reshape(H * HD)
        y = lin(x, W, b)                                                   # [B,N,768]
        y = op('Reshape', [y, const(np.array([0, -1, H, HD], np.int64))])   # [B,N,H,64]
        return op('Transpose', [y], perm=[0, 2, 1, 3])                      # [B,H,N,64]
    q = op('Mul', [proy(q_in, 'query'), const(np.float32(1 / np.sqrt(HD)))])
    k = proy(kv_in, 'key'); v = proy(kv_in, 'value')
    a = op('Softmax', [op('MatMul', [q, op('Transpose', [k], perm=[0, 1, 3, 2])])], axis=-1)
    o = op('Transpose', [op('MatMul', [a, v])], perm=[0, 2, 1, 3])         # [B,N,H,64]
    o = op('Reshape', [o, const(np.array([0, -1, H * HD], np.int64))])
    return lin(o, p(f'{pre}/out/kernel').reshape(H * HD, D), p(f'{pre}/out/bias'))
def mlp_o(x, pre):
    y = gelu_o(lin(x, p(f'{pre}/Dense_0/kernel'), p(f'{pre}/Dense_0/bias')))
    return lin(y, p(f'{pre}/Dense_1/kernel'), p(f'{pre}/Dense_1/bias'))

# entrada: [B,3,224,224] ya normalizada a [-1,1]
Wc = p('embedding/kernel').transpose(3, 2, 0, 1)                         # HWIO -> OIHW
x = op('Conv', ['pixel_values', const(Wc), const(p('embedding/bias'))], kernel_shape=[16, 16], strides=[16, 16])
x = op('Transpose', [op('Reshape', [x, const(np.array([0, D, -1], np.int64))])], perm=[0, 2, 1])  # [B,196,768]
x = op('Add', [x, const(p('pos_embedding'))])
for i in range(L):
    b = f'Transformer/encoderblock_{i}'
    y = ln_o(x, f'{b}/LayerNorm_0')
    x = op('Add', [x, mha_o(y, y, f'{b}/MultiHeadDotProductAttention_0')])
    x = op('Add', [x, mlp_o(ln_o(x, f'{b}/LayerNorm_1'), f'{b}/MlpBlock_0')])
x = ln_o(x, 'Transformer/encoder_norm')
# MAP head: el "probe" pregunta a todos los parches
B = op('Slice', [op('Shape', ['pixel_values']), const(np.array([0], np.int64)), const(np.array([1], np.int64))])
probe = op('Expand', [const(p('MAPHead_0/probe')), op('Concat', [B, const(np.array([1, D], np.int64))], axis=0)])
y = mha_o(probe, x, 'MAPHead_0/MultiHeadDotProductAttention_0')
y = op('Add', [y, mlp_o(ln_o(y, 'MAPHead_0/LayerNorm_0'), 'MAPHead_0/MlpBlock_0')])
out = op('Squeeze', [y, const(np.array([1], np.int64))])
nodos.append(h.make_node('Identity', [out], ['embedding']))

g = h.make_graph(nodos, 'siglip_b16_imagen',
                 [h.make_tensor_value_info('pixel_values', T.FLOAT, ['batch', 3, 224, 224])],
                 [h.make_tensor_value_info('embedding', T.FLOAT, ['batch', D])], inits)
m = h.make_model(g, opset_imports=[h.make_opsetid('', 17)], producer_name='fabrica-casos')
m.ir_version = 8
onnx.checker.check_model(m)
onnx.save(m, SALIDA)
print('ONNX guardado', SALIDA)

# ---------------- comprobación ----------------
import onnxruntime as ort
rng = np.random.default_rng(0)
img = rng.uniform(-1, 1, (2, 224, 224, 3)).astype(np.float32)
ref = referencia(img)
s = ort.InferenceSession(SALIDA, providers=['CPUExecutionProvider'])
got = s.run(None, {'pixel_values': img.transpose(0, 3, 1, 2)})[0]
print('máx diferencia numpy vs ONNX:', float(np.abs(ref - got).max()), '| norma:', float(np.linalg.norm(ref[0])))
