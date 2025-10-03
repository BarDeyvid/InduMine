#include <iostream>
#include <fstream>
#include <cmath>
#include <vector>
#include <random>
using namespace std;

double sigmoid(double x) {
    return 1.0 / (1.0 + exp(-x));
}

double sigmoid_deriv(double x) {  // Derivada: s(1-s), mas usa no z pra evitar recompute
    double s = sigmoid(x);
    return s * (1.0 - s);
}

vector<double> generateWeights(size_t inputSize) {
    vector<double> weights(inputSize);
    random_device rd;
    mt19937 gen(rd());
    uniform_real_distribution<> dis(-sqrt(1.0 / inputSize), sqrt(1.0 / inputSize));
    for (size_t i = 0; i < inputSize; ++i) {
        weights[i] = dis(gen);
    }
    return weights;
}

class Neuron {
public:
    vector<double> weights;
    double bias;

    Neuron(size_t inputSize) : weights(generateWeights(inputSize)), bias(0.0) {}

    double feedForward(const vector<double>& inputs, double* z_out = nullptr) {  // Opcional: retorna z se precisar
        double z = bias;
        for (size_t i = 0; i < inputs.size(); ++i) {
            z += inputs[i] * weights[i];
        }
        if (z_out) *z_out = z;
        return sigmoid(z);
    }

    void updateWeights(const vector<double>& input, double delta, double lr) {  // delta = dL/dz * deriv
        for (size_t i = 0; i < weights.size(); ++i) {
            weights[i] -= lr * delta * input[i];
        }
        bias -= lr * delta;
    }

    // Pra backprop: grad wrt input (pra propagar pra layer anterior)
    vector<double> getInputGradient(double delta, const vector<double>& input) {
        vector<double> grad_input(weights.size());
        double deriv = sigmoid_deriv(computeZ(input));  // z interno
        delta *= deriv;  // Corrige: delta já é dL/da, multiplica por da/dz
        for (size_t i = 0; i < weights.size(); ++i) {
            grad_input[i] = delta * weights[i];  // Não, wait: dL/dx_j = delta * w_j (pra cada input j)
        }
        return grad_input;  // Erro: é por neurônio, mas ajusta no layer
    }
    void save(ofstream& file) const {
        file << bias << " ";
        for (double w : weights) {
            file << w << " ";
        }
        file << "\n";
    }

    void load(ifstream& file) {
        file >> bias;
        for (size_t i = 0; i < weights.size(); ++i) {
            file >> weights[i];
        }
    }


private:
    double computeZ(const vector<double>& inputs) {
        double z = bias;
        for (size_t i = 0; i < inputs.size(); ++i) {
            z += inputs[i] * weights[i];
        }
        return z;
    }
};

class Layer {
public:
    vector<Neuron> neurons;
    size_t numNeurons;
    vector<double> z_values;  // Armazena z pra backprop
    vector<double> a_values;  // Armazena ativações

    Layer(size_t nNeurons, size_t inputSize) : numNeurons(nNeurons) {
        neurons.reserve(numNeurons);
        for (size_t i = 0; i < numNeurons; ++i) {
            neurons.emplace_back(inputSize);
        }
        z_values.resize(numNeurons);
        a_values.resize(numNeurons);
    }

    vector<double> feedForward(const vector<double>& inputs) {
        a_values.resize(numNeurons);
        z_values.resize(numNeurons);
        for (size_t i = 0; i < numNeurons; ++i) {
            a_values[i] = neurons[i].feedForward(inputs, &z_values[i]);
        }
        return a_values;
    }

    // Backprop: calcula deltas = dL/dz pra cada neurônio
    vector<double> backward(const vector<double>& next_delta, const vector<double>& next_a) {  // next_delta é dL/da da próxima layer
        vector<double> this_delta(numNeurons);
        vector<double> prev_grad;  // Pra retornar dL/da_prev (pra layer anterior)

        for (size_t i = 0; i < numNeurons; ++i) {
            // dL/dz_i = (sum over next: next_delta_j * W_ji ) * sigmoid'(z_i)
            double sum_weighted = 0.0;
            for (size_t j = 0; j < next_delta.size(); ++j) {
                sum_weighted += next_delta[j] * neurons[i].weights[j];  
            }
            this_delta[i] = sum_weighted * sigmoid_deriv(z_values[i]);
        }
        return this_delta;
    }

    void update(const vector<double>& input, const vector<double>& deltas, double lr) {
        for (size_t i = 0; i < numNeurons; ++i) {
            vector<double> input_grad(numNeurons);  
            neurons[i].updateWeights(input, deltas[i], lr);
        }
    }
    void save(ofstream& file) const {
        file << numNeurons << " " << neurons[0].weights.size() << "\n";
        for (const Neuron& neuron : neurons) {
            neuron.save(file);
        }
    }

    void load(ifstream& file) {
        size_t nNeurons, inputSize;
        file >> nNeurons >> inputSize;
        neurons.clear();
        neurons.reserve(nNeurons);
        for (size_t i = 0; i < nNeurons; ++i) {
            Neuron neuron(inputSize);
            neuron.load(file);
            neurons.push_back(neuron);
        }
        numNeurons = nNeurons;
        z_values.resize(nNeurons);
        a_values.resize(nNeurons);
    }
};

class NeuralNetwork {
public:
    Layer hiddenLayer;
    Layer shiddenLayer;
    Layer outputLayer;
    size_t inputSize;
    double lr = 0.1;

    NeuralNetwork(size_t inputSize, size_t hiddenSize, size_t outputSize, double learningRate = 0.1)
        : inputSize(inputSize), hiddenLayer(hiddenSize, inputSize), shiddenLayer(hiddenSize, inputSize), outputLayer(outputSize, hiddenSize), lr(learningRate) {}

    double feedForward(const vector<double>& inputs) {
        vector<double> hidden = hiddenLayer.feedForward(inputs);
        vector<double> shidden = hiddenLayer.feedForward(hidden);
        vector<double> output = outputLayer.feedForward(shidden);
        return output[0];
    }

    double trainStep(const vector<double>& inputs, double target) {
        vector<double> hidden_a = hiddenLayer.feedForward(inputs);       
        vector<double> hidden_b = shiddenLayer.feedForward(hidden_a);  
        vector<double> output_a = outputLayer.feedForward(hidden_b);   
        double pred = output_a[0];

        double loss = 0.5 * (pred - target) * (pred - target);

        double out_delta = (pred - target) * sigmoid_deriv(outputLayer.z_values[0]);

        outputLayer.neurons[0].updateWeights(hidden_b, out_delta, lr);

        vector<double> shidden_delta(shiddenLayer.numNeurons);
        for (size_t i = 0; i < shiddenLayer.numNeurons; ++i) {
            shidden_delta[i] = out_delta * outputLayer.neurons[0].weights[i];
            shidden_delta[i] *= sigmoid_deriv(shiddenLayer.z_values[i]);
        }

        shiddenLayer.update(hidden_a, shidden_delta, lr);

        vector<double> hidden_delta(hiddenLayer.numNeurons);
        for (size_t i = 0; i < hiddenLayer.numNeurons; ++i) {
            hidden_delta[i] = 0.0;
            for (size_t j = 0; j < shiddenLayer.numNeurons; ++j) {
                hidden_delta[i] += shidden_delta[j] * shiddenLayer.neurons[j].weights[i];
            }
            hidden_delta[i] *= sigmoid_deriv(hiddenLayer.z_values[i]);
        }

        hiddenLayer.update(inputs, hidden_delta, lr);

        return loss;
    }
    void saveModel(const string& filename) const {
        ofstream file(filename);
        if (!file.is_open()) {
            cerr << "Erro ao salvar modelo.\n";
            return;
        }
        hiddenLayer.save(file);
        shiddenLayer.save(file);
        outputLayer.save(file);
        file.close();
        cout << "Modelo salvo em " << filename << endl;
    }

    void loadModel(const string& filename) {
        ifstream file(filename);
        if (!file.is_open()) {
            cerr << "Erro ao carregar modelo.\n";
            return;
        }
        hiddenLayer.load(file);
        shiddenLayer.load(file);
        outputLayer.load(file);
        file.close();
        cout << "Modelo carregado de " << filename << endl;
    }

};

int main() {
    vector<vector<double>> xorInputs = {{0, 0}, {0, 1}, {1, 0}, {1, 1}};
    vector<double> xorTargets = {0, 1, 1, 0};

    NeuralNetwork nn(2, 2, 1, 0.1);

    cout << "Treino XOR (1000000 epocas):" << endl;
    double total_loss = 0.0;
    for (int epoch = 0; epoch < 100000000; ++epoch) {
        total_loss = 0.0;
        for (size_t i = 0; i < xorInputs.size(); ++i) {
            double loss = nn.trainStep(xorInputs[i], xorTargets[i]);
            total_loss += loss;
        }
        if (epoch % 1000 == 0) {
            cout << "Epoca " << epoch << ", Loss media: " << total_loss / xorInputs.size() << endl;
        }
    }

    cout << "\nPreds finais:" << endl;
    for (size_t i = 0; i < xorInputs.size(); ++i) {
        double pred = nn.feedForward(xorInputs[i]);
        cout << "Input: [" << xorInputs[i][0] << ", " << xorInputs[i][1] << "], Predicted: " << pred 
             << " (target: " << xorTargets[i] << ")" << endl;
    }
    nn.saveModel("modelo_xor.txt");

    return 0;
}