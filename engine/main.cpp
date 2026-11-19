// CipherState engine. Input and output use tab-separated records on standard I/O.
#include <algorithm>
#include <cctype>
#include <iostream>
#include <map>
#include <queue>
#include <set>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>
using namespace std;
using States = set<int>;
struct Edge { int from, to; char symbol; };
struct Fragment { int start, end; };
template<class... T> void emit(const string& tag, const T&... fields) {
    cout << tag; ((cout << '\t' << fields), ...); cout << '\n';
}
string members(const States& s) {
    string out;
    for (int n:s) out += (out.empty()?"":",")+to_string(n);
    return out.empty()?"empty":out;
}
struct Thompson {
    string regex; size_t pos=0; int count=0; vector<Edge> edges; set<char> alphabet;
    bool log; Fragment root;
    char peek() const { return pos<regex.size()?regex[pos]:0; }
    void edge(int a,int b,char c=0){edges.push_back({a,b,c});}
    Fragment step(string op, Fragment f){
        if(log) emit("build",op,f.start,f.end,edges.size()); return f;
    }
    Fragment atom(){
        char c=peek();
        if(c=='('){++pos; auto f=expression(); if(peek()!=')') throw runtime_error("Missing closing parenthesis"); ++pos;return f;}
        if(!isalnum(static_cast<unsigned char>(c)) && c!='~') throw runtime_error("Expected a letter, digit, group or ~");
        ++pos; Fragment f{count,count+1}; count+=2;
        if(c!='~') alphabet.insert(c);
        edge(f.start,f.end,c=='~'?0:c); return step(string("Read ")+c,f);
    }
    Fragment repeat(){
        auto f=atom();
        while(peek()=='*'){++pos;Fragment g{count,count+1};count+=2;
            edge(g.start,f.start);edge(g.start,g.end);edge(f.end,f.start);edge(f.end,g.end);f=step("Kleene star",g);}
        return f;
    }
    Fragment sequence(){
        auto f=repeat();
        while(peek() && peek()!='|' && peek()!=')'){
            auto g=repeat();edge(f.end,g.start);f=step("Concatenate",{f.start,g.end});
        }return f;
    }
    Fragment expression(){
        auto f=sequence();
        while(peek()=='|'){++pos;auto g=sequence();Fragment h{count,count+1};count+=2;
            edge(h.start,f.start);edge(h.start,g.start);edge(f.end,h.end);edge(g.end,h.end);f=step("Union",h);}
        return f;
    }
    Thompson(string r,bool trace):regex(r),log(trace){
        if(r.size()>100) throw runtime_error("Regex exceeds 100 characters");
        root=expression();if(peek()) throw runtime_error("Unexpected closing parenthesis");
        if(log){emit("nfa",root.start,root.end);for(auto e:edges)emit("ne",e.from,e.to,e.symbol?string(1,e.symbol):"ε");}
    }
    States closure(States s) const{
        queue<int> pending;for(int q:s)pending.push(q);
        while(!pending.empty()){int q=pending.front();pending.pop();
            for(auto e:edges)if(e.from==q&&!e.symbol&&s.insert(e.to).second)pending.push(e.to);}
        return s;
    }
};
struct DFA {
    vector<map<char,int>> rows; States finals;int start=0;
    int next(int q,char c)const{
        if(q<0 || !rows.at(q).count(c))return -1; return rows[q].at(c);
    }
};
DFA determinize(const Thompson& n,bool log){
    DFA d;vector<States> subsets{n.closure({n.root.start})};map<States,int> ids{{subsets[0],0}};
    for(size_t i=0;i<subsets.size();++i){
        if(subsets.size()>256)throw runtime_error("DFA exceeds 256 states");
        d.rows.emplace_back();if(subsets[i].count(n.root.end))d.finals.insert(i);
        if(log)emit("state",i,members(subsets[i]),d.finals.count(i));
        for(char c:n.alphabet){
            States moved;for(auto e:n.edges)if(e.symbol==c&&subsets[i].count(e.from))moved.insert(e.to);
            auto target=n.closure(moved);auto entry=ids.emplace(target,subsets.size());
            if(entry.second)subsets.push_back(target);
            int j=entry.first->second;d.rows[i][c]=j;if(log)emit("de",i,j,c,members(moved),members(target));
        }
    }return d;
}
using Pair=pair<int,int>;
bool equivalent(const DFA& a,const DFA& b,const set<char>& alphabet){
    Pair first{a.start,b.start};queue<Pair> todo;todo.push(first);
    map<Pair,pair<Pair,char>> parent{{first,{first,0}}};
    while(!todo.empty()){
        auto p=todo.front();todo.pop();
        if(a.finals.count(p.first)!=b.finals.count(p.second)){
            string w;for(auto q=p;q!=first;q=parent.at(q).first)w+=parent.at(q).second;
            reverse(w.begin(),w.end());emit("compare",0,w,a.finals.count(p.first),b.finals.count(p.second),parent.size());return false;
        }
        for(char c:alphabet){Pair q{a.next(p.first,c),b.next(p.second,c)};
            if(parent.emplace(q,make_pair(p,c)).second)todo.push(q);}
    }emit("compare",1,"",0,0,parent.size());return true;
}
string line(){string s;if(!getline(cin,s))throw runtime_error("Incomplete engine input");return s;}
vector<string> split(const string& s,char delim){
    vector<string> parts(1);for(char c:s){if(c==delim)parts.emplace_back();else parts.back()+=c;}return parts;
}
int main(){try{
    string mode=line(),rule=line(),reference=line(),message=line(),mapping=line(),wheels=line(),offsets=line();
    Thompson n(rule,true),ref(reference,false);auto d=determinize(n,true),target=determinize(ref,false);
    set<char> alphabet=n.alphabet;alphabet.insert(ref.alphabet.begin(),ref.alphabet.end());
    if(mode=="builder"){
        DFA user;int count=stoi(line());if(count<1||count>32)throw runtime_error("Use 1–32 states");
        user.rows.resize(count);user.start=stoi(line());if(user.start<0||user.start>=count)throw runtime_error("Invalid start state");
        for(int i=0;i<count;++i){istringstream row(line());int final;row>>final;if(final)user.finals.insert(i);
            char c;int j;while(row>>c>>j){if(j<0||j>=count)throw runtime_error("Invalid destination");user.rows[i][c]=j;alphabet.insert(c);}}
        equivalent(user,target,alphabet);d=user;
    }else equivalent(d,target,alphabet);
    map<string,string> code;for(auto item:split(mapping,',')){auto kv=split(item,'=');if(kv.size()==2)code[kv[0]]=kv[1];}
    string decoded;bool complete=true;auto tokens=split(message,'-');
    for(size_t i=0;i<tokens.size();++i){
        int q=d.start;int k=0;for(char c:tokens[i]){int next=d.next(q,c);emit("trace",i,k++,q,c,next);q=next;}
        bool ok=d.finals.count(q);emit("token",i,tokens[i],ok,q);complete &= ok;
        if(ok && code.count(tokens[i])){emit("mealy",0,tokens[i],0,code.at(tokens[i]));decoded+=code.at(tokens[i]);}
        else if(!code.empty())complete=false;
    }
    if(mode=="wheel"&&complete){
        auto pins=split(wheels,',');auto pos=split(offsets,',');vector<int> p;
        for(auto s:pos)p.push_back(stoi(s));
        if(message.size()%8)throw runtime_error("Use full eight-bit bytes");
        int byte=0,k=0;
        for(char c:message){int key=0;string before;
            for(int i=0;i<3;++i){p.at(i)%=pins.at(i).size();before+=(i?",":"")+to_string(p[i]);
                key^=pins[i][p[i]]-'0';p[i]=(p[i]+1)%pins[i].size();}
            int bit=(c-'0')^key;emit("wheel",before,c,key,bit,to_string(p[0])+","+to_string(p[1])+","+to_string(p[2]));
            byte=byte*2+bit;if(++k%8==0){decoded+=byte>=32&&byte<=126?char(byte):'?';byte=0;}
        }
    }
    emit("result",complete,complete?decoded:"");
}catch(const exception& e){cerr<<e.what();return 1;}}
